import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

export async function GET(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;

  const { user } = result;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarBase64: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, plan: true } },
    },
  });

  if (!dbUser) return jsonError(req, "api.notFound", 404);

  return Response.json({
    user: dbUser,
    authMethod: user.authMethod,
  });
}

const PatchSchema = z.object({
  name: z.string().min(1).max(80).nullable().optional(),
  avatarBase64: z.string().max(500_000).nullable().optional(), // ~370KB base64 max
});

export async function PATCH(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return localizedError(req, 400, {
      tr: body.error.issues[0]?.message ?? "Geçersiz veri",
      en: body.error.issues[0]?.message ?? "Invalid data",
    });
  }

  const data: { name?: string | null; avatarBase64?: string | null } = {};
  const changedFields: string[] = [];
  if (body.data.name !== undefined) {
    data.name = body.data.name?.trim() || null;
    changedFields.push("name");
  }
  if (body.data.avatarBase64 !== undefined) {
    if (body.data.avatarBase64 && !body.data.avatarBase64.startsWith("data:image/")) {
      return localizedError(req, 400, {
        tr: "Geçersiz görsel formatı.",
        en: "Invalid image format.",
      });
    }
    data.avatarBase64 = body.data.avatarBase64;
    changedFields.push("avatar");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, avatarBase64: true },
  });

  childLogger({ component: "me-update" }).info({ userId: user.id }, "Profile updated");

  // KVKK md. 13 audit trail — değişen alan adlarını yaz (PII içerik değil)
  const { ipAddress, userAgent } = activityContextFromRequest(req);
  await recordActivity({
    userId: user.id,
    tenantId: user.tenantId,
    email: updated.email,
    action: changedFields.includes("avatar") && changedFields.length === 1
      ? "profile.avatar.update"
      : "profile.update",
    metadata: { fields: changedFields },
    ipAddress,
    userAgent,
  });

  return Response.json({ user: updated });
}
