import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { extractClientIp } from "@/lib/http/clientIp";
import { sha256Hex } from "@/lib/crypto/hash";
import { generateSecureToken } from "@/lib/crypto/token";
import { passwordResetEmail } from "@/lib/auth/passwordResetEmail";
const BodySchema = z.object({ email: z.string().email() });
const LIMIT = { prefix: "forgot-pw", max: 3, windowMs: 60 * 60_000 };

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, LIMIT);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { email } = body;
  const log = childLogger({ component: "forgot-password", email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log.info({}, "Forgot password for unknown email — silent OK");
    return Response.json({ ok: true });
  }

  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/reset-password?token=${rawToken}`;
  const { subject, html } = passwordResetEmail(resetUrl);
  void sendEmail({ to: email, subject, html });

  log.info({ userId: user.id }, "Password reset link sent");
  return Response.json({ ok: true });
}
