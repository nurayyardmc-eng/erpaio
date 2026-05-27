import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { lookupCache, recordOutcome, recordSuccess } from "@/lib/cache/queryCache";
import { extractColumns } from "@/lib/chat/extractColumns";
import { ensureChatSession } from "@/lib/chat/ensureChatSession";
import { persistChatExchange } from "@/lib/chat/persistChatExchange";
import { buildChatPromptContext } from "@/lib/chat/buildPromptContext";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUserFromSession } from "@/lib/observability/sentryUser";
import { RATE_LIMITS, rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import {
  parseJsonBody,
  activeConnectionNotFoundError,
  invalidQuestionError,
} from "@/lib/http/searchParams";
import { checkAndConsume, recordUsage, budgetExhaustedError } from "@/lib/budget";
import { loadProfile, resolveProfileSlug } from "@/lib/erpProfiles";
import { z } from "zod";
import { jsonError, localizedError, serverMessages } from "@/lib/i18n/server";
import { parseAiResponse } from "@/lib/ai/parseResponse";
import { confidenceBucket } from "@/lib/ai/confidence";
import { pickDialect, dialectRules } from "@/lib/ai/dialect";
import { formatChatHistoryForAi } from "@/lib/ai/chatHistory";
import { calculateBillableTokens, isPromptCacheHit } from "@/lib/ai/tokenUsage";
import { MODEL_SONNET, anthropicClient } from "@/lib/ai/models";
import { extractAnthropicText } from "@/lib/ai/extractAnthropicText";
import { truncateRows } from "@/lib/chat/rowLimit";


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
  if (!limit.success) return rateLimited429(req, limit, { includeRateLimitInfo: true });

  const budget = await checkAndConsume(tenantId, 5000);
  if (!budget.ok) return budgetExhaustedError(req, budget);

  if (detectInjection(question)) return invalidQuestionError(req);

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
    select: { id: true, erpType: true, erpProfile: true },
  });
  if (!conn) return activeConnectionNotFoundError(req);

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
      const { schema, profileContext, sampleContext, annotationsContext, erpName } =
        await buildChatPromptContext(connectionId, erpProfile, tenantId);

      // Dialect-aware: Postgres / MS SQL / MySQL syntax differences (DDDDD)
      const { name: dialectName, isPostgres } = pickDialect(conn.erpType, conn.erpProfile);

      const dialectRulesText = dialectRules(isPostgres);

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
${dialectRulesText}
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

      const msg = await anthropicClient.messages.create({
        model: MODEL_SONNET,
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

      const rawText = extractAnthropicText(msg);

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
    const columns = extractColumns(rows);
    const latencyMs = Date.now() - t0;

    cacheId = await recordSuccess({ cacheId, cacheHit, tenantId, question, sqlQuery: sql });

    const sid = await ensureChatSession(sessionId, tenantId, session.user.id);
    await persistChatExchange({ sessionId: sid, question, sql, rowCount: rows.length, latencyMs });

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
