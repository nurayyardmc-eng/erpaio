import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

/**
 * Cihaz (push token) yönetimi — kullanıcının kayıtlı tüm cihazlarını listeler
 * ve istediği cihazı revoke etmesine izin verir.
 *
 * KVKK md. 11 + GDPR Art. 15 (right of access — hangi cihazlar veri alıyor?)
 * + GDPR Art. 17 (right to erasure — kullanıcı cihaz silinmesini talep edebilir).
 *
 * Tenant admin'in /api/admin değil; bu endpoint sadece kullanıcının kendi
 * cihazlarına erişir (where userId).
 */

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  // Mobile çağrıdaysa kendi token'ını query'de geçirip "Bu cihaz" rozeti almak
  // için işaretlenmesini ister. Server token'ları response'a vermez — sadece
  // `isCurrent: true/false` yansıtır.
  const { searchParams } = new URL(req.url);
  const currentToken = searchParams.get("currentToken");

  const rows = await prisma.pushToken.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      token: true,
      platform: true,
      deviceName: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  const devices = rows.map(({ token, ...rest }) => ({
    ...rest,
    isCurrent: currentToken ? token === currentToken : false,
  }));

  return Response.json({ devices });
}

const DeleteSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.NOTIFICATION_PREFS);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const { searchParams } = new URL(req.url);
  const parsed = DeleteSchema.safeParse({ id: searchParams.get("id") });
  if (!parsed.success) {
    return localizedError(req, 400, {
      tr: "id gerekli.",
      en: "id required.",
    });
  }

  // userId scope-check — başka kullanıcının cihazını silmeye çalışırsa
  // deleteMany count: 0 döner, 404 verilir.
  const result = await prisma.pushToken.deleteMany({
    where: { id: parsed.data.id, userId: session.user.id },
  });

  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Cihaz bulunamadı.",
      en: "Device not found.",
    });
  }

  await recordActivity({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email ?? null,
    action: "push_token.revoke",
    target: parsed.data.id,
    ...activityContextFromRequest(req),
  });

  return Response.json({ ok: true });
}
