import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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
    pinned: chatSession.pinned,
    archivedAt: chatSession.archivedAt,
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

const PatchSchema = z.object({
  title: z.string().min(1).max(120).nullish(),
  pinned: z.boolean().nullish(),
  archived: z.boolean().nullish(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/chat/sessions/[id]">) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id } = await ctx.params;
  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  const owned = await prisma.chatSession.findFirst({
    where: { id, tenantId: session.user.tenantId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  const data: { title?: string; pinned?: boolean; archivedAt?: Date | null } = {};
  if (typeof body.data.title === "string") data.title = body.data.title;
  if (typeof body.data.pinned === "boolean") data.pinned = body.data.pinned;
  if (typeof body.data.archived === "boolean") {
    data.archivedAt = body.data.archived ? new Date() : null;
  }

  const updated = await prisma.chatSession.update({
    where: { id },
    data,
    select: { id: true, title: true, pinned: true, archivedAt: true },
  });

  return Response.json(updated);
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
