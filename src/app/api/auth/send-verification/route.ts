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
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
      <div style="max-width:480px;margin:0 auto;background:#0C1018;border:1px solid #131A26;border-radius:12px;padding:32px">
        <div style="color:#00E5FF;font-size:11px;letter-spacing:3px;margin-bottom:8px">ERPAIO</div>
        <h2 style="font-size:18px;margin:0 0 12px">Email doğrulama</h2>
        <p style="color:#9AA5B4;font-size:13px;line-height:1.6">
          Hesabınızı tam aktive etmek için aşağıdaki bağlantıya tıklayın. Link 24 saat geçerlidir.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;background:#00E5FF;color:#07090F;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Email'i doğrula →</a>
        <p style="color:#3A4558;font-size:11px">Bu talebi siz yapmadıysanız emaili silebilirsiniz.</p>
      </div>
    </body></html>`,
    tenantId: session.user.tenantId,
  });

  return Response.json({ ok: true });
}
