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
export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().nullish(),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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

  const { question, connectionId, sessionId } = body.data;
  const tenantId = session.user.tenantId;

  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) {
    return Response.json({ error: "Çok fazla istek." }, { status: 429 });
  }

  const budget = await checkAndConsume(tenantId, 5000);
  if (!budget.ok) {
    return Response.json({ error: budget.reason }, { status: 402 });
  }

  if (detectInjection(question)) {
    return Response.json({ error: "Geçersiz soru." }, { status: 400 });
  }

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
    select: { id: true, erpType: true, erpProfile: true },
  });
  if (!conn) return Response.json({ error: "Aktif bağlantı bulunamadı." }, { status: 404 });

  const log = childLogger({ component: "chat-stream", tenantId, userId: session.user.id });
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
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
          const profileSlug = conn.erpProfile ?? (conn.erpType === "nebim_v3" ? "nebim_v3" : null);
          const erpProfile = profileSlug ? loadProfile(profileSlug) : null;
          const schema = await getSchema(connectionId);
          const profileContext = erpProfile ? profileToPromptContext(erpProfile) : "";
          const sampleContext = erpProfile
            ? sampleRowsToPromptContext(await getSampleRows(connectionId, erpProfile))
            : "";
          const annotationsContext = annotationsToPromptContext(await getAnnotations(tenantId));
          const erpName = erpProfile?.name ?? "ERP";

          const systemText = `Sen bir SQL Server uzmanısın. ${erpName} veritabanına Türkçe doğal dil sorularını SQL'e çevir.
Sadece SELECT/WITH, başka komut yasak. NVARCHAR + N'...' Türkçe için.

${profileContext}

${annotationsContext}

${sampleContext}

## CANLI ŞEMA
${schema}`;

          let buffer = "";
          await client.messages
            .stream({
              model: "claude-sonnet-4-5",
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
        await prisma.chatMessage.createMany({
          data: [
            { sessionId: sid, role: "user", content: question },
            { sessionId: sid, role: "assistant", content: sql, sqlQuery: sql, rowCount: rows.length, latencyMs, success: true },
          ],
        });

        const ROW_LIMIT = 500;
        send("result", {
          sql,
          results: rows.slice(0, ROW_LIMIT),
          columns,
          total: rows.length,
          truncated: rows.length > ROW_LIMIT,
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
