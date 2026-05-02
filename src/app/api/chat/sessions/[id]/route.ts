import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, ctx: RouteContext<"/api/chat/sessions/[id]">) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id } = await ctx.params;

  const chatSession = await prisma.chatSession.findFirst({
    where: { id, tenantId: session.user.tenantId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chatSession) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  return Response.json({
    id: chatSession.id,
    title: chatSession.title,
    createdAt: chatSession.createdAt,
    messages: chatSession.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sqlQuery: m.sqlQuery,
      rowCount: m.rowCount,
      latencyMs: m.latencyMs,
      success: m.success,
      feedback: m.feedback,
      createdAt: m.createdAt,
    })),
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/chat/sessions/[id]">) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id } = await ctx.params;

  const owned = await prisma.chatSession.findFirst({
    where: { id, tenantId: session.user.tenantId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  await prisma.chatSession.delete({ where: { id } });
  return Response.json({ ok: true });
}
