import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { getSchema } from "@/lib/cache/schema";
import { lookupCache, writeCache, recordOutcome } from "@/lib/cache/queryCache";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUserFromSession } from "@/lib/observability/sentryUser";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkAndConsume, recordUsage } from "@/lib/budget";
import { loadProfile, profileToPromptContext, resolveProfileSlug } from "@/lib/erpProfiles";
import { getSampleRows, sampleRowsToPromptContext } from "@/lib/cache/sampleRows";
import { getAnnotations, annotationsToPromptContext } from "@/lib/cache/annotations";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { jsonError, localizedError, serverMessages } from "@/lib/i18n/server";
import { parseAiResponse } from "@/lib/ai/parseResponse";
import { confidenceBucket } from "@/lib/ai/confidence";
import { pickDialect } from "@/lib/ai/dialect";
import { formatChatHistoryForAi } from "@/lib/ai/chatHistory";
import { calculateBillableTokens, isPromptCacheHit } from "@/lib/ai/tokenUsage";
import { truncateRows } from "@/lib/chat/rowLimit";

const client = new Anthropic();

const CONFIDENCE_THRESHOLD = 0.5;

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().nullish(),
  forceRun: z.boolean().nullish(),
});

async function loadConversationHistory(
  sessionId: string,
  tenantId: string,
) {
  const messages = await prisma.chatMessage.findMany({
    where: { session: { id: sessionId, tenantId } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true, sqlQuery: true, success: true, rowCount: true },
  });
  return formatChatHistoryForAi(messages);
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  setSentryUserFromSession(session);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { question, connectionId, sessionId, forceRun } = body;
  const tenantId = session.user.tenantId;

  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) {
    return Response.json(
      { error: serverMessages(req).api.rateLimited },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)),
          "X-RateLimit-Remaining": String(limit.remaining),
          "X-RateLimit-Reset": String(limit.reset),
        },
      },
    );
  }

  const budget = await checkAndConsume(tenantId, 5000);
  if (!budget.ok) {
    return Response.json(
      { error: budget.reason, remainingTokens: budget.remaining },
      { status: 402 },
    );
  }

  if (detectInjection(question)) return localizedError(req, 400, { tr: "Geçersiz soru.", en: "Invalid question." });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
    select: { id: true, erpType: true, erpProfile: true },
  });
  if (!conn) return localizedError(req, 404, { tr: "Aktif bağlantı bulunamadı.", en: "No active connection found." });

  const profileSlug = resolveProfileSlug(conn.erpType, conn.erpProfile);
  const erpProfile = profileSlug ? loadProfile(profileSlug) : null;

  const log = childLogger({ component: "chat", tenantId, userId: session.user.id });
  const t0 = Date.now();
  let sql = "";
  let cacheId: string | undefined;
  let cacheHit = false;
  let confidence = 1;
  let explanation = "";
  let ambiguity: string | null = null;

  try {
    const cached = await lookupCache(tenantId, question);

    if (cached.hit && cached.sqlQuery) {
      sql = cached.sqlQuery;
      cacheId = cached.cacheId;
      cacheHit = true;
      Sentry.setTag("chat.cache_hit", true);
      log.info(
        { event: "cache_hit", cacheId, successCount: cached.successCount, failCount: cached.failCount },
        "Query cache hit",
      );
    } else {
      Sentry.setTag("chat.cache_hit", false);
      Sentry.setTag("chat.erp_profile", profileSlug ?? "none");
      const schema = await getSchema(connectionId);

      const profileContext = erpProfile ? profileToPromptContext(erpProfile) : "";
      const sampleContext = erpProfile
        ? sampleRowsToPromptContext(await getSampleRows(connectionId, erpProfile))
        : "";
      const annotationsContext = annotationsToPromptContext(await getAnnotations(tenantId));
      const erpName = erpProfile?.name ?? "ERP";

      // Dialect-aware: Postgres / MS SQL / MySQL syntax differences (DDDDD)
      const { name: dialectName, isPostgres } = pickDialect(conn.erpType, conn.erpProfile);

      const dialectRules = isPostgres
        ? `- String literal: '...' (NVARCHAR yok). Türkçe karakterler doğrudan UTF-8.
- Tarih: NOW(), CURRENT_DATE, INTERVAL '1 day', date_trunc('month', col).
- LIMIT n (TOP n yok).
- Identifier quoting: "tabloAdi" (köşeli parantez yok).
- TÜRKÇE TEXT KARŞILAŞTIRMA — KRİTİK:
  * Şehir/ad/ürün adı/kategori gibi text alanlarda ASLA "=" kullanma.
  * Her zaman ILIKE ile wildcard pattern: WHERE m.sehir ILIKE '%istanbul%'
  * Türkçe i/İ/I/ı karakterleri arasında karışıklık olabilir, ILIKE bunu önler (case-insensitive).
  * Yazım hatası toleransı için kullanıcı sorgusundaki kelimenin EN AYIRT EDİCİ KÖKÜNÜ % ile çevrele.
    Örn: "istanbul" → '%stanbul%' (i/İ farkı önemsiz), "Ankara" → '%nkara%', "İzmir" → '%zmir%'.
  * Noktasız ASCII transliterasyonu kullan (İstanbul/Istanbul/istambul hepsi '%stanbul%' ile yakalanır).
  * Sadece kesin eşleşme istenmediyse her text WHERE'de bu desen.`
        : `- Türkçe karakterler için NVARCHAR + N'...' prefix.
- Tarih: GETDATE(), DATEADD(), CAST(... AS DATE).
- TOP n (LIMIT yok).
- Identifier: [tabloAdi] (köşeli parantez).
- TÜRKÇE TEXT KARŞILAŞTIRMA — KRİTİK:
  * ASLA "=" kullanma text alanlarda.
  * LOWER(col) LIKE LOWER(N'%kök%') kullan.
  * Yazım hatası + i/İ toleransı için kelimenin ayırt edici kökünü % ile çevrele.
    Örn: "istanbul" → LIKE LOWER(N'%stanbul%'), "Ankara" → LIKE LOWER(N'%nkara%').`;

      const profileSpecificRules = erpProfile?.slug === "nebim_v3"
        ? "- IptalDurumu = 0 her zaman filtrele (varsa)."
        : "";

      const systemText = `Sen bir ${dialectName} uzmanısın. ${erpName} veritabanına Türkçe doğal dil sorularını SQL SELECT sorgusuna çeviriyorsun.

YANIT FORMATI (zorunlu, sadece JSON, başka hiçbir şey yazma):
{
  "sql": "SELECT ...",
  "confidence": 0.85,
  "explanation": "tek cümle, hangi tablo+kolonu neden seçtin",
  "ambiguity": null veya "soru belirsizse 1 cümle açıkla, alternatif yorumlar"
}

CONFIDENCE REHBERİ:
- 0.95-1.0: profile glossary'de açık karşılığı var, belirsizlik yok
- 0.7-0.94: profile/şema yeterli, makul varsayım gerekti
- 0.4-0.69: sorgu belirsiz, birden fazla yorum olası — ambiguity DOLDUR
- <0.4: yetersiz bilgi, SQL üretme — confidence düşür, ambiguity ile sebep

KESİN KURALLAR:
- Sadece SELECT veya WITH — DROP/DELETE/UPDATE/INSERT/ALTER/EXEC/MERGE YASAK.
- SADECE aşağıdaki şemada listelenen tablo ve kolonları kullan. Şemada olmayan kolon/tablo asla varsayma.
${dialectRules}
${profileSpecificRules}
- ERP profiline ÖNCELİK VER — şema listesi referans, profile semantic.

${profileContext}

${annotationsContext}

${sampleContext}

## CANLI ŞEMA (information_schema çıktısı)
${schema}`;

      const conversationHistory = sessionId
        ? await loadConversationHistory(sessionId, tenantId)
        : [];

      const msg = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: systemText,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          ...conversationHistory,
          { role: "user", content: question },
        ],
      });

      const block = msg.content.find((b) => b.type === "text");
      const rawText = (block && "text" in block ? block.text : "")?.trim() ?? "";

      const parsed = parseAiResponse(rawText);
      sql = parsed.sql;
      confidence = parsed.confidence;
      explanation = parsed.explanation;
      ambiguity = parsed.ambiguity;

      const usage = msg.usage as typeof msg.usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      const totalTokens = calculateBillableTokens(usage);
      void recordUsage(tenantId, totalTokens);
      log.info(
        {
          event: "ai_generated",
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreated: usage.cache_creation_input_tokens ?? 0,
          cacheRead: usage.cache_read_input_tokens ?? 0,
          totalTokens,
          confidence,
          hasAmbiguity: !!ambiguity,
        },
        "Claude generated SQL",
      );
      if (isPromptCacheHit(usage)) {
        Sentry.setTag("chat.prompt_cache_hit", true);
      }
      Sentry.setTag("chat.confidence_bucket", confidenceBucket(confidence));
    }

    if (!cacheHit && confidence < CONFIDENCE_THRESHOLD && !forceRun) {
      log.info({ event: "low_confidence", confidence, ambiguity }, "Asking user to confirm");
      return Response.json({
        needsConfirmation: true,
        sql,
        confidence,
        explanation,
        ambiguity,
        sessionId,
      }, { status: 200 });
    }

    validateSQL(sql);

    const rows = await queryERP(connectionId, sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const latencyMs = Date.now() - t0;

    if (cacheHit && cacheId) {
      await recordOutcome(cacheId, true);
    } else if (!cacheHit) {
      cacheId = await writeCache(tenantId, question, sql);
    }

    let sid = sessionId;
    if (!sid) {
      const s = await prisma.chatSession.create({
        data: { tenantId, userId: session.user.id },
      });
      sid = s.id;
    }
    const created = await prisma.chatMessage.createMany({
      data: [
        { sessionId: sid, role: "user", content: question },
        { sessionId: sid, role: "assistant", content: sql, sqlQuery: sql, rowCount: rows.length, latencyMs, success: true },
      ],
    });
    void created;

    const assistantMsg = await prisma.chatMessage.findFirst({
      where: { sessionId: sid, role: "assistant" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    log.info(
      { event: "chat_ok", cacheHit, latencyMs, rows: rows.length, messageId: assistantMsg?.id },
      "Chat query succeeded",
    );

    const t = truncateRows(rows);

    return Response.json({
      sql,
      results: t.results,
      columns,
      total: t.total,
      truncated: t.truncated,
      rowLimit: t.rowLimit,
      latencyMs,
      sessionId: sid,
      messageId: assistantMsg?.id,
      cacheHit,
      cacheId,
    });

  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    log.warn({ err, event: "chat_error", cacheHit }, "Chat query failed");

    if (cacheHit && cacheId) {
      await recordOutcome(cacheId, false).catch((recordErr) => {
        log.error({ err: recordErr, cacheId }, "recordOutcome(false) failed");
      });
    }

    if (err.name === "SQLValidationError") {
      return Response.json({ error: err.message, sql }, { status: 400 });
    }
    if (err.name === "AIError") {
      Sentry.captureException(e, { tags: { component: "chat", subsystem: "claude" } });
      return localizedError(req, 502, { tr: "Soru SQL'e çevrilemedi.", en: "Could not translate question into SQL." });
    }
    Sentry.captureException(e, { tags: { component: "chat", cacheHit: String(cacheHit) } });
    return Response.json({ error: serverMessages(req).api.serverError, detail: err.message }, { status: 500 });
  }
}
