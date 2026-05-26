import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordUserActivity } from "@/lib/audit/activity";
import { requireOwner, requireOwnerOrAdmin } from "@/lib/auth/role";
import { zTeamRole } from "@/lib/auth/schemas";

const PatchSchema = z.object({
  userId: z.string(),
  role: zTeamRole(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, email: true, name: true, role: true, createdAt: true, totpEnabled: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { tenantId: session.user.tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return Response.json({ users, invitations });
}

export async function PATCH(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwner(req, session.user.role, {
    tr: "Yalnızca tenant sahibi rol değiştirebilir.",
    en: "Only the tenant owner can change roles.",
  });
  if (denied) return denied;

  const body = await parseJsonBody(req, PatchSchema);
  if (body instanceof Response) return body;

  // Owner devri bu endpoint'ten yapılamaz — atomic transfer için ayrı endpoint gerekli.
  if (body.role === "owner") {
    return localizedError(req, 400, { tr: "Owner devri için ayrı endpoint kullanın (henüz yok).", en: "Use a separate endpoint for owner transfer (not yet available)." });
  }

  // Hedef kullanıcı tenant içinde mevcut mu?
  const target = await prisma.user.findFirst({
    where: { id: body.userId, tenantId: session.user.tenantId },
    select: { role: true },
  });
  if (!target) return localizedError(req, 404, { tr: "Kullanıcı bulunamadı.", en: "User not found." });

  // Son owner düşürülemez — tenant orphan kalmasın.
  if (target.role === "owner") {
    const ownerCount = await prisma.user.count({
      where: { tenantId: session.user.tenantId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return localizedError(req, 400, { tr: "Son owner rolü düşürülemez. Önce başka birini owner yapın.", en: "Cannot demote the last owner. Promote someone else to owner first." });
    }
  }

  await prisma.user.updateMany({
    where: { id: body.userId, tenantId: session.user.tenantId },
    data: { role: body.role },
  });

  await recordUserActivity(req, session, {
    action: "team.role.change",
    target: body.userId,
    metadata: { newRole: body.role },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const invitationId = searchParams.get("invitationId");

  if (userId) {
    if (userId === session.user.id) {
      return localizedError(req, 400, { tr: "Kendi hesabınızı silmek için /dashboard/settings → Hesabı sil.", en: "To delete your own account, go to /dashboard/settings → Delete account." });
    }
    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId: session.user.tenantId },
      select: { role: true, email: true },
    });
    if (target?.role === "owner") {
      return localizedError(req, 400, { tr: "Owner silinemez.", en: "Owner cannot be deleted." });
    }
    await prisma.user.deleteMany({ where: { id: userId, tenantId: session.user.tenantId } });
    await recordUserActivity(req, session, {
      action: "team.member.remove",
      target: userId,
      metadata: { removedEmail: target?.email ?? null, removedRole: target?.role ?? null },
    });
  } else if (invitationId) {
    await prisma.invitation.deleteMany({ where: { id: invitationId, tenantId: session.user.tenantId } });
    await recordUserActivity(req, session, {
      action: "team.member.remove",
      target: invitationId,
      metadata: { kind: "invitation" },
    });
  } else {
    return localizedError(req, 400, { tr: "userId veya invitationId gerekli.", en: "userId or invitationId required." });
  }

  return Response.json({ ok: true });
}
