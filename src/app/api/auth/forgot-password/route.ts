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
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
      <div style="max-width:480px;margin:0 auto;background:#0C1018;border:1px solid #131A26;border-radius:12px;padding:32px">
        <div style="color:#00E5FF;font-size:11px;letter-spacing:3px;margin-bottom:8px">ERPAIO</div>
        <h2 style="font-size:18px;margin:0 0 12px">Şifre sıfırlama</h2>
        <p style="color:#9AA5B4;font-size:13px;line-height:1.6">Aşağıdaki bağlantıya tıklayarak yeni bir şifre belirleyin. Link 1 saat geçerlidir.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:20px 0;background:#00E5FF;color:#07090F;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Şifreyi sıfırla →</a>
        <p style="color:#3A4558;font-size:11px;line-height:1.5">Bu talebi siz yapmadıysanız bu emaili silebilirsiniz, hesabınız güvende.</p>
      </div>
    </body></html>`,
  });

  log.info({ userId: user.id }, "Password reset link sent");
  return Response.json({ ok: true });
}
