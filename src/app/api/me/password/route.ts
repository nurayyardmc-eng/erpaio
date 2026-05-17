import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

const BodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.PASSWORD_CHANGE);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return localizedError(req, 404, { tr: "Kullanıcı bulunamadı.", en: "User not found." });

  const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
  if (!valid) return localizedError(req, 400, { tr: "Mevcut şifre hatalı.", en: "Current password is incorrect." });

  if (body.data.currentPassword === body.data.newPassword) {
    return localizedError(req, 400, { tr: "Yeni şifre mevcut şifre ile aynı olamaz.", en: "New password cannot be the same as the current one." });
  }

  const newHash = await bcrypt.hash(body.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
  });

  childLogger({ component: "password-change" }).info({ userId: session.user.id }, "Password changed");

  const { ipAddress, userAgent } = activityContextFromRequest(req);
  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "password.change",
    ipAddress,
    userAgent,
  });

  return Response.json({ ok: true });
}
