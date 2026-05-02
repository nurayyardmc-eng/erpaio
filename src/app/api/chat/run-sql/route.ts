import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { validateSQL } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { z } from "zod";

const BodySchema = z.object({
  sql: z.string().min(1).max(10_000),
  connectionId: z.string(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const tenantId = session.user.tenantId;
  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) {
    return Response.json(
      { error: "Çok fazla istek." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)) } },
    );
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { sql, connectionId, sessionId } = body.data;

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
  });
  if (!conn) return Response.json({ error: "Aktif bağlantı bulunamadı." }, { status: 404 });

  const log = childLogger({ component: "chat-run-sql", tenantId, userId: session.user.id });
  const t0 = Date.now();

  try {
    validateSQL(sql);
    const rows = await queryERP(connectionId, sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const latencyMs = Date.now() - t0;

    let sid = sessionId;
    if (!sid) {
      const s = await prisma.chatSession.create({
        data: { tenantId, userId: session.user.id, title: "Manuel SQL" },
      });
      sid = s.id;
    }
    const created = await prisma.chatMessage.create({
      data: {
        sessionId: sid,
        role: "assistant",
        content: sql,
        sqlQuery: sql,
        rowCount: rows.length,
        latencyMs,
        success: true,
      },
      select: { id: true },
    });

    log.info({ event: "run_sql_ok", latencyMs, rows: rows.length }, "Manual SQL ran");

    return Response.json({
      sql,
      results: rows.slice(0, 500),
      columns,
      total: rows.length,
      latencyMs,
      sessionId: sid,
      messageId: created.id,
    });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    log.warn({ err, event: "run_sql_error" }, "Manual SQL failed");

    if (err.name === "SQLValidationError") {
      return Response.json({ error: err.message }, { status: 400 });
    }
    Sentry.captureException(e, { tags: { component: "chat-run-sql" } });
    return Response.json({ error: "SQL çalıştırılamadı.", detail: err.message }, { status: 500 });
  }
}
