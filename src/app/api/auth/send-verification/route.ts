import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError, localizedError, resolveLocale } from "@/lib/i18n/server";
import { createEmailVerificationToken } from "@/lib/auth/createEmailVerificationToken";
import { emailVerificationEmail } from "@/lib/auth/emailVerifyEmail";
import { baseUrl } from "@/lib/url";

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.id, RATE_LIMITS.VERIFY_EMAIL_RESEND);
  if (!limit.success) return localizedError(req, 429, { tr: "Çok fazla istek. 1 saat sonra deneyin.", en: "Too many requests. Try again in 1 hour." });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerifiedAt: true, name: true },
  });
  if (!user) return jsonError(req, "api.notFound", 404);
  if (user.emailVerifiedAt) return Response.json({ ok: true, alreadyVerified: true });

  const { raw } = await createEmailVerificationToken(session.user.id);
  const verifyUrl = `${baseUrl()}/verify-email?token=${raw}`;
  const { subject, html } = emailVerificationEmail(verifyUrl, resolveLocale(req));
  void sendEmail({ to: user.email, subject, html, tenantId: session.user.tenantId });

  return Response.json({ ok: true });
}
