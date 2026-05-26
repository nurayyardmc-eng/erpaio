import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { extractClientIp } from "@/lib/http/clientIp";
import { sha256Hex } from "@/lib/crypto/hash";
import { zPassword } from "@/lib/auth/schemas";
const BodySchema = z.object({
  token: z.string().min(8),
  password: zPassword(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  // Brute force koruması: IP başına saatte 5 deneme
  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, RATE_LIMITS.RESET_PASSWORD);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return localizedError(req, 400, {
      tr: body.error.issues[0]?.message ?? "Geçersiz veri",
      en: body.error.issues[0]?.message ?? "Invalid data",
    });
  }

  const { token, password } = body.data;
  const log = childLogger({ component: "reset-password" });

  const tokenHash = sha256Hex(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.apiToken.updateMany({ where: { userId: row.userId, revoked: false }, data: { revoked: true } }),
  ]);

  log.info({ userId: row.userId }, "Password reset");
  return Response.json({ ok: true });
}
