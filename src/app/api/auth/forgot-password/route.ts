import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({ email: z.string().email() });
const LIMIT = { prefix: "forgot-pw", max: 3, windowMs: 60 * 60_000 };

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(ip, LIMIT);
  if (!limit.success) {
    return Response.json({ error: "Çok fazla deneme." }, { status: 429 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: "Geçersiz email." }, { status: 400 });

  const { email } = body.data;
  const log = childLogger({ component: "forgot-password", email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log.info({}, "Forgot password for unknown email — silent OK");
    return Response.json({ ok: true });
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/reset-password?token=${rawToken}`;

  void sendEmail({
    to: email,
    subject: "ERPAIO — Şifre sıfırlama linki",
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
        <div style="color:#1A2B47;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
        <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">Şifre Sıfırlama</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">Aşağıdaki bağlantıya tıklayarak yeni bir şifre belirleyin. Link 1 saat geçerlidir.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1A2B47;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Şifreyi sıfırla</a>
        <p style="color:#94A3B8;font-size:12px;line-height:1.5;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu talebi siz yapmadıysanız bu emaili silebilirsiniz, hesabınız güvende.</p>
      </div>
    </body></html>`,
  });

  log.info({ userId: user.id }, "Password reset link sent");
  return Response.json({ ok: true });
}
