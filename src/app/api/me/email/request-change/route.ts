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
  const subject = locale === "en"
    ? "Confirm your new ERPAIO email"
    : "Yeni ERPAIO email adresinizi onaylayın";
  const bodyHtml = locale === "en"
    ? `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
          <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
          <h2 style="font-size:22px;margin:0 0 12px;font-weight:700">Confirm new email</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
            Click the button below to confirm this is your new email address for ERPAIO. The link is valid for 24 hours.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Confirm Email Change</a>
          <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">If you didn't request this change, ignore this email. Your current email will stay active.</p>
        </div>
      </body></html>`
    : `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
          <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
          <h2 style="font-size:22px;margin:0 0 12px;font-weight:700">Yeni email adresinizi onaylayın</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
            Aşağıdaki butona tıklayarak ERPAIO hesabınız için bu yeni email adresini onaylayın. Link 24 saat geçerli.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Email Değişikliğini Onayla</a>
          <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu değişikliği siz talep etmediyseniz emaili silebilirsiniz. Mevcut email'iniz aktif kalır.</p>
        </div>
      </body></html>`;

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

/**
 * Email mask: t***@example.com — audit log'da raw görünmesin.
 * Pure helper test edilebilir; basit + defensive.
 */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 1) return `*${domain}`;
  return `${local[0]}***${domain}`;
}
