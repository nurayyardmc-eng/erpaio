import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { lookupCache, recordSuccess } from "@/lib/cache/queryCache";
import { extractColumns } from "@/lib/chat/extractColumns";
import { ensureChatSession } from "@/lib/chat/ensureChatSession";
import { persistChatExchange } from "@/lib/chat/persistChatExchange";
import { buildChatPromptContext } from "@/lib/chat/buildPromptContext";
import { findActiveErpConnectionForChat } from "@/lib/db/findActiveErpConnection";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUserFromSession } from "@/lib/observability/sentryUser";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import {
  parseJsonBody,
  activeConnectionNotFoundError,
  invalidQuestionError,
} from "@/lib/http/searchParams";
import { checkAndConsume, recordUsage, budgetExhaustedError } from "@/lib/budget";
import { estimateChatTokens } from "@/lib/budget/estimate";
import { loadProfile, resolveProfileSlug } from "@/lib/erpProfiles";
import { z } from "zod";
import { jsonError } from "@/lib/i18n/server";
import { sseFrame } from "@/lib/http/sse";
import { truncateRows } from "@/lib/chat/rowLimit";
import { MODEL_SONNET, anthropicClient } from "@/lib/ai/models";

export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().nullish(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  setSentryUserFromSession(session);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { question, connectionId, sessionId } = body;
  const tenantId = session.user.tenantId;

  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) return rateLimited429(req, limit);

  // P2 — question-aware pre-flight estimate (was a flat 5000).
  const budget = await checkAndConsume(tenantId, estimateChatTokens({ questionChars: question.length }));
  if (!budget.ok) {
    return budgetExhaustedError(req, budget);
  }

  if (detectInjection(question)) {
    return invalidQuestionError(req);
  }

  const conn = await findActiveErpConnectionForChat(connectionId, tenantId);
  if (!conn) return activeConnectionNotFoundError(req);

  const log = childLogger({ component: "chat-stream", tenantId, userId: session.user.id });
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseFrame(event, data)));
      };

      try {
        const cached = await lookupCache(tenantId, question);
        let sql: string;
        let cacheId: string | undefined;
        let cacheHit = false;

        if (cached.hit && cached.sqlQuery) {
          sql = cached.sqlQuery;
          cacheId = cached.cacheId;
          cacheHit = true;
          send("cache_hit", { sql, cacheId });
        } else {
          send("phase", { phase: "ai" });
          const profileSlug = resolveProfileSlug(conn.erpType, conn.erpProfile);
          const erpProfile = profileSlug ? loadProfile(profileSlug) : null;
          const { schema, profileContext, sampleContext, annotationsContext, erpName } =
            await buildChatPromptContext(connectionId, erpProfile, tenantId);

          const systemText = `Sen bir SQL Server uzmanısın. ${erpName} veritabanına Türkçe doğal dil sorularını SQL'e çevir.
Sadece SELECT/WITH, başka komut yasak. NVARCHAR + N'...' Türkçe için.

${profileContext}

${annotationsContext}

${sampleContext}

## CANLI ŞEMA
${schema}`;

          let buffer = "";
          await anthropicClient.messages
            .stream({
              model: MODEL_SONNET,
              max_tokens: 1024,
              system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
              messages: [{ role: "user", content: question }],
            })
            .on("text", (delta) => {
              buffer += delta;
              send("sql_delta", { text: delta });
            })
            .finalMessage();

          sql = buffer.trim();
          send("sql_done", { sql });
        }

        send("phase", { phase: "validating" });
        validateSQL(sql);

        send("phase", { phase: "executing" });
        const rows = await queryERP(connectionId, sql);
        const columns = extractColumns(rows);
        const latencyMs = Date.now() - t0;

        cacheId = await recordSuccess({ cacheId, cacheHit, tenantId, question, sqlQuery: sql });

        const sid = await ensureChatSession(sessionId, tenantId, session.user.id);
        await persistChatExchange({ sessionId: sid, question, sql, rowCount: rows.length, latencyMs });

        const t = truncateRows(rows);
        send("result", {
          sql,
          results: t.results,
          columns,
          total: t.total,
          truncated: t.truncated,
          latencyMs,
          sessionId: sid,
          cacheHit,
        });

        log.info({ event: "stream_ok", cacheHit, latencyMs, rows: rows.length }, "Chat stream completed");
        if (!cacheHit) void recordUsage(tenantId, 5000);
      } catch (err) {
        const e = err as { name?: string; message?: string };
        log.warn({ err, event: "stream_error" }, "Chat stream failed");
        Sentry.captureException(err, { tags: { component: "chat-stream" } });
        send("error", {
          name: e.name ?? "Error",
          message: e.message ?? "Bilinmeyen hata",
        });
      } finally {
        send("done", {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
