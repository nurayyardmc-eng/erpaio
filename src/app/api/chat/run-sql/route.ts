import * as Sentry from "@sentry/nextjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { validateSQL } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import { childLogger } from "@/lib/observability/logger";
import { setSentryUserFromSession } from "@/lib/observability/sentryUser";
import { RATE_LIMITS, rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody, activeConnectionNotFoundError } from "@/lib/http/searchParams";
import { jsonError, serverMessages } from "@/lib/i18n/server";
import { z } from "zod";

const BodySchema = z.object({
  sql: z.string().min(1).max(10_000),
  connectionId: z.string(),
  sessionId: z.string().nullish(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  setSentryUserFromSession(session);

  const tenantId = session.user.tenantId;
  const limit = await rateLimit(tenantId, RATE_LIMITS.CHAT);
  if (!limit.success) return rateLimited429(req, limit);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { sql, connectionId, sessionId } = body;

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
  });
  if (!conn) return activeConnectionNotFoundError(req);

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
    return Response.json({ error: serverMessages(req).api.serverError, detail: err.message }, { status: 500 });
  }
}
