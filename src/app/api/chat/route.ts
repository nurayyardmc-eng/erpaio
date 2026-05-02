import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getSchema } from "@/lib/cache/schema";
import { lookupCache, writeCache, recordOutcome } from "@/lib/cache/queryCache";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUser } from "@/lib/observability/sentryUser";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  setSentryUser({
    id: session.user.id,
    email: session.user.email,
    tenantId: session.user.tenantId,
    role: session.user.role,
  });

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { question, connectionId, sessionId } = body.data;
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

  if (detectInjection(question)) return Response.json({ error: "Geçersiz soru." }, { status: 400 });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
  });
  if (!conn) return Response.json({ error: "Aktif bağlantı bulunamadı." }, { status: 404 });

  const log = childLogger({ component: "chat", tenantId, userId: session.user.id });
  const t0 = Date.now();
  let sql = "";
  let cacheId: string | undefined;
  let cacheHit = false;

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
      const schema = await getSchema(connectionId);

      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: `Sen bir SQL Server uzmanısın. Nebim V3 ERP veritabanı şemasına göre kullanıcının sorusunu SQL SELECT sorgusuna çevir.
KURAL: Sadece SQL döndür. Açıklama yazma. DROP/DELETE/UPDATE/INSERT yasak.
Türkçe karakterler için NVARCHAR ve N prefix kullan.

ŞEMA:
${schema}`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: question }],
      });

      const block = msg.content.find((b) => b.type === "text");
      sql = (block && "text" in block ? block.text : "")?.trim() ?? "";

      const usage = msg.usage as typeof msg.usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      log.info(
        {
          event: "ai_generated",
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreated: usage.cache_creation_input_tokens ?? 0,
          cacheRead: usage.cache_read_input_tokens ?? 0,
        },
        "Claude generated SQL",
      );
      if (typeof usage.cache_read_input_tokens === "number" && usage.cache_read_input_tokens > 0) {
        Sentry.setTag("chat.prompt_cache_hit", true);
      }
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

    return Response.json({
      sql,
      results: rows.slice(0, 500),
      columns,
      total: rows.length,
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
