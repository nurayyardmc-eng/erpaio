import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const before = searchParams.get("before");
  const role = searchParams.get("role") ?? undefined;
  const success = searchParams.get("success");

  const messages = await prisma.chatMessage.findMany({
    where: {
      session: { tenantId: session.user.tenantId },
      ...(role && { role }),
      ...(success !== null && { success: success === "true" }),
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
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
    nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt : null,
  });
}
