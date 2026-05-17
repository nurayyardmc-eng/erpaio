import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseQuery, zNumber, zBoolean, zIsoDate } from "@/lib/http/searchParams";

const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 500, default: 100, int: true }),
  before: zIsoDate().optional(),
  role: z.enum(["user", "assistant", "system"]).optional(),
  success: zBoolean().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const messages = await prisma.chatMessage.findMany({
    where: {
      session: { tenantId: session.user.tenantId },
      ...(q.role && { role: q.role }),
      ...(q.success !== undefined && { success: q.success }),
      ...(q.before && { createdAt: { lt: q.before } }),
    },
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      role: true,
      content: true,
      sqlQuery: true,
      rowCount: true,
      latencyMs: true,
      success: true,
      feedback: true,
      createdAt: true,
      session: { select: { id: true, userId: true, user: { select: { email: true } } } },
    },
  });

  return Response.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sqlQuery: m.sqlQuery,
      rowCount: m.rowCount,
      latencyMs: m.latencyMs,
      success: m.success,
      feedback: m.feedback,
      createdAt: m.createdAt,
      sessionId: m.session.id,
      userEmail: m.session.user.email,
    })),
    nextCursor: messages.length === q.limit ? messages[messages.length - 1].createdAt : null,
  });
}
