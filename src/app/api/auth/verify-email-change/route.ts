import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";

import { extractClientIp } from "@/lib/http/clientIp";
/**
 * Email change verification.
 *
 * Token (request-change'ten gönderilen email içindeki link) ile çağrılır.
 * Atomik olarak:
 *   - User.email yeni adres olarak güncellenir
 *   - emailVerifiedAt yeni email için reset edilir (yeni email henüz
 *     doğrulanmadı — kullanıcının doğrulamayı tekrar yapması gerekir; bu
 *     mevcut emailVerify flow ile uyumlu)
 *   - Token usedAt set edilir
 *
 * Brute force korunması: IP başına saatte 10 deneme (VERIFY_EMAIL ile aynı
 * bucket; her ikisi de tek kullanımlık token doğrular).
 *
 * Failure: invalid/expired/used token → 400 + auth.invalidToken.
 * Collision: newEmail araya girmiş başka kullanıcı tarafından alınmışsa
 * 409 dön (nadir race — paralel signup; defensive).
 */
const BodySchema = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, RATE_LIMITS.VERIFY_EMAIL);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return jsonError(req, "auth.invalidToken", 400);

  const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
  const row = await prisma.emailChangeToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      newEmail: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { email: true, tenantId: true } },
    },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  // Email collision (race window) — başka kullanıcı newEmail'i aldı.
  const conflict = await prisma.user.findUnique({
    where: { email: row.newEmail },
    select: { id: true },
  });
  if (conflict && conflict.id !== row.userId) {
    childLogger({ component: "verify-email-change" }).warn(
      { userId: row.userId, newEmail: row.newEmail },
      "Email collision on verify — newEmail registered by another user during the window",
    );
    return localizedError(req, 409, {
      tr: "Bu email başka bir hesapta kayıtlı.",
      en: "This email is registered to another account.",
    });
  }

  // Atomik update: email + emailVerifiedAt reset + token used.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { email: row.newEmail, emailVerifiedAt: null },
    }),
    prisma.emailChangeToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await recordActivity({
    userId: row.userId,
    tenantId: row.user.tenantId,
    email: row.newEmail, // YENI email (kayıt sonrası gerçek email)
    action: "email.change.complete",
    metadata: { oldEmail: row.user.email, newEmail: row.newEmail },
    ...activityContextFromRequest(req),
  });

  childLogger({ component: "verify-email-change" }).info(
    { userId: row.userId },
    "Email change completed",
  );

  return Response.json({ ok: true });
}
