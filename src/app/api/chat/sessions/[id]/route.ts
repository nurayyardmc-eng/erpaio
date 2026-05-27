import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { assertOwnedChatSession } from "@/lib/chat/assertOwnedChatSession";
import { findOwnedChatSessionWithMessages } from "@/lib/chat/findOwnedChatSession";
import { z } from "zod";

export async function GET(req: Request, ctx: RouteContext<"/api/chat/sessions/[id]">) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await ctx.params;

  const chatSession = await findOwnedChatSessionWithMessages(
    id,
    session.user.tenantId,
    session.user.id,
  );
  if (!chatSession) return jsonError(req, "api.notFound", 404);

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
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await ctx.params;
  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  const denied = await assertOwnedChatSession(req, id, session.user.tenantId, session.user.id);
  if (denied) return denied;

  const data: { title?: string; pinned?: boolean; archivedAt?: Date | null } = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (typeof body.archived === "boolean") {
    data.archivedAt = body.archived ? new Date() : null;
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
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await ctx.params;

  const denied = await assertOwnedChatSession(req, id, session.user.tenantId, session.user.id);
  if (denied) return denied;

  await prisma.chatSession.delete({ where: { id } });
  return Response.json({ ok: true });
}
