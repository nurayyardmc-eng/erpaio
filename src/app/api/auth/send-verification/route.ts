import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const limit = await rateLimit(session.user.id, {
    prefix: "verify-resend",
    max: 3,
    windowMs: 60 * 60_000,
  });
  if (!limit.success) return Response.json({ error: "Çok fazla istek. 1 saat sonra deneyin." }, { status: 429 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerifiedAt: true, name: true },
  });
  if (!user) return Response.json({ error: "Bulunamadı." }, { status: 404 });
  if (user.emailVerifiedAt) return Response.json({ ok: true, alreadyVerified: true });

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

  await prisma.emailVerificationToken.create({
    data: { userId: session.user.id, tokenHash, expiresAt },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/verify-email?token=${rawToken}`;

  void sendEmail({
    to: user.email,
    subject: "ERPAIO email adresinizi doğrulayın",
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
        <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
        <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">Email Doğrulama</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
          Hesabınızı tam olarak aktive etmek için aşağıdaki bağlantıya tıklayın. Link 24 saat geçerlidir.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Email&apos;i Doğrula</a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu talebi siz yapmadıysanız emaili silebilirsiniz.</p>
      </div>
    </body></html>`,
    tenantId: session.user.tenantId,
  });

  return Response.json({ ok: true });
}
