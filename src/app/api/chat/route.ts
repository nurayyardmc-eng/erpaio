import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { getSchema } from "@/lib/cache/schema";
import { lookupCache, writeCache, recordOutcome } from "@/lib/cache/queryCache";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUser } from "@/lib/observability/sentryUser";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { checkAndConsume, recordUsage } from "@/lib/budget";
import { loadProfile, profileToPromptContext } from "@/lib/erpProfiles";
import { getSampleRows, sampleRowsToPromptContext } from "@/lib/cache/sampleRows";
import { getAnnotations, annotationsToPromptContext } from "@/lib/cache/annotations";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const CONFIDENCE_THRESHOLD = 0.5;

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().nullish(),
  forceRun: z.boolean().nullish(),
});

interface AiResponse {
  sql: string;
  confidence: number;
  explanation: string;
  ambiguity: string | null;
}

async function loadConversationHistory(
  sessionId: string,
  tenantId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await prisma.chatMessage.findMany({
    where: { session: { id: sessionId, tenantId } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true, sqlQuery: true, success: true, rowCount: true },
  });
  return messages
    .reverse()
    .filter((m) => m.success)
    .map((m) => {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      const summary = m.sqlQuery
        ? `${m.sqlQuery}\n\n(${m.rowCount ?? 0} satır döndü)`
        : m.content;
      return { role: "assistant" as const, content: summary };
    });
}

function parseAiResponse(raw: string): AiResponse {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<AiResponse>;
    return {
      sql: typeof parsed.sql === "string" ? parsed.sql.trim() : "",
      confidence:
        typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1
          ? parsed.confidence
          : 0.5,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
      ambiguity: typeof parsed.ambiguity === "string" ? parsed.ambiguity : null,
    };
  } catch {
    return {
      sql: cleaned,
      confidence: 0.7,
      explanation: "",
      ambiguity: null,
    };
  }
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  setSentryUser({
    id: session.user.id,
    email: session.user.email,
    tenantId: session.user.tenantId,
    role: session.user.role,
  });

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { question, connectionId, sessionId, forceRun } = body.data;
  const tenantId = session.user.tenantId;

  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) {
    return Response.json(
      { error: "Çok fazla istek. Biraz sonra tekrar deneyin." },
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

  if (detectInjection(question)) return Response.json({ error: "Geçersiz soru." }, { status: 400 });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
    select: { id: true, erpType: true, erpProfile: true },
  });
  if (!conn) return Response.json({ error: "Aktif bağlantı bulunamadı." }, { status: 404 });

  const profileSlug = conn.erpProfile ?? (conn.erpType === "nebim_v3" ? "nebim_v3" : null);
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

      const systemText = `Sen bir SQL Server uzmanısın. ${erpName} veritabanına Türkçe doğal dil sorularını SQL SELECT sorgusuna çeviriyorsun.

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
- Türkçe karakterler için NVARCHAR + N'...' prefix.
- IptalDurumu = 0 her zaman filtrele (varsa).
- Tarih: GETDATE(), DATEADD(), CAST(... AS DATE).
- ERP profiline ÖNCELİK VER — şema listesi referans, profile semantic.

${profileContext}

${annotationsContext}

${sampleContext}

## CANLI ŞEMA (INFORMATION_SCHEMA çıktısı)
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
      const totalTokens =
        usage.input_tokens +
        usage.output_tokens +
        (usage.cache_creation_input_tokens ?? 0);
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
      if (typeof usage.cache_read_input_tokens === "number" && usage.cache_read_input_tokens > 0) {
        Sentry.setTag("chat.prompt_cache_hit", true);
      }
      Sentry.setTag("chat.confidence_bucket",
        confidence >= 0.95 ? "high" : confidence >= 0.7 ? "med" : confidence >= 0.4 ? "low" : "very_low");
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

    const ROW_LIMIT = 500;
    const truncated = rows.length > ROW_LIMIT;

    return Response.json({
      sql,
      results: rows.slice(0, ROW_LIMIT),
      columns,
      total: rows.length,
      truncated,
      rowLimit: ROW_LIMIT,
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
      await recordOutcome(cacheId, false).catch(() => {});
    }

    if (err.name === "SQLValidationError") {
      return Response.json({ error: err.message, sql }, { status: 400 });
    }
    if (err.name === "AIError") {
      Sentry.captureException(e, { tags: { component: "chat", subsystem: "claude" } });
      return Response.json({ error: "Soru SQL'e çevrilemedi." }, { status: 502 });
    }
    Sentry.captureException(e, { tags: { component: "chat", cacheHit: String(cacheHit) } });
    return Response.json({ error: "Sorgu çalıştırılamadı.", detail: err.message }, { status: 500 });
  }
}
