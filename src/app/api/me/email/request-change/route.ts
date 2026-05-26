import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError, localizedError, resolveLocale } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";
import { childLogger } from "@/lib/observability/logger";
import { maskEmail } from "@/lib/auth/maskEmail";
import { emailChangeConfirmEmail } from "@/lib/auth/emailChangeEmail";

/**
 * Email change isteği başlatma.
 *
 * Akış:
 *   1. Kullanıcı yeni email + mevcut şifre gönderir
 *   2. Server şifre doğrular, newEmail unique check, EmailChangeToken üretir
 *   3. Token raw değeri YENİ email'e doğrulama linki olarak gönderilir
 *   4. Kullanıcı link tıklar → /auth/email-changed → POST /verify-email-change
 *      → User.email atomik güncellenir
 *
 * Tasarım kararı: eski email'e bildirim göndermiyoruz çünkü kullanıcı zaten
 * şu anki email'e erişimi kaybetmiş olabilir (genelde değiştirme sebebi bu).
 * Audit log entry KVKK md. 13 kapsamında her iki adımı kaydeder.
 *
 * Rate limit: EMAIL_CHANGE_REQUEST 3/saat/user. Server her zaman 200
 * "doğrulama emaili gönderildi" döner — newEmail collision olsa bile (info
 * leak'i önlemek için, password reset gibi).
 */
const BodySchema = z.object({
  newEmail: z.string().email().max(190),
  currentPassword: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.EMAIL_CHANGE_REQUEST);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const newEmail = body.newEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true, tenantId: true },
  });
  if (!user) return jsonError(req, "api.notFound", 404);

  // Aynı email değişikliği no-op.
  if (user.email.toLowerCase() === newEmail) {
    return localizedError(req, 400, {
      tr: "Yeni email mevcut email ile aynı.",
      en: "New email is the same as current.",
    });
  }

  const passwordOk = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!passwordOk) {
    return localizedError(req, 400, {
      tr: "Mevcut şifre hatalı.",
      en: "Current password is incorrect.",
    });
  }

  // newEmail başka bir kullanıcıda kayıtlıysa SESSIZCE 200 dön (info leak
  // önleme). Doğrulama emaili yine de gönderilmez (DB'ye token yazılmaz).
  const collision = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  const log = childLogger({ component: "email-change", userId: user.id });
  if (collision && collision.id !== user.id) {
    log.warn({ newEmail }, "Email change requested for already-registered address — silent skip");
    return Response.json({ ok: true });
  }

  // Token üret + hash sakla. 24h geçerli.
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

  await prisma.emailChangeToken.create({
    data: { userId: user.id, newEmail, tokenHash, expiresAt },
  });

  const locale = resolveLocale(req);
  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/auth/email-changed?token=${raw}`;
  const { subject, html: bodyHtml } = emailChangeConfirmEmail(locale, verifyUrl);

  void sendEmail({
    to: newEmail,
    subject,
    html: bodyHtml,
    tenantId: user.tenantId,
  });

  await recordActivity({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email, // OLD email (audit kim talepte bulundu)
    action: "email.change.request",
    metadata: { newEmailMasked: maskEmail(newEmail) },
    ...activityContextFromRequest(req),
  });

  log.info({ userId: user.id }, "Email change verification sent");
  return Response.json({ ok: true });
}

// maskEmail moved to @/lib/auth/maskEmail (Track LLLLLL).
