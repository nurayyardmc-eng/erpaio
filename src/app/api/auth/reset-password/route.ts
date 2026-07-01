import { hashPassword } from "@/lib/auth/hashPassword";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";
import { RATE_LIMITS, enforceIpRateLimit } from "@/lib/rateLimit";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { sha256Hex } from "@/lib/crypto/hash";
import { zPassword } from "@/lib/auth/schemas";
import { isTokenUsable } from "@/lib/auth/oneTimeToken";
const BodySchema = z.object({
  token: z.string().min(8),
  password: zPassword(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  // Brute force koruması: IP başına saatte 5 deneme
  const limited = await enforceIpRateLimit(req, RATE_LIMITS.RESET_PASSWORD);
  if (limited) return limited;

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { token, password } = body;
  const log = childLogger({ component: "reset-password" });

  const tokenHash = sha256Hex(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!isTokenUsable(row)) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    // Clear any lockout — a user who forgot their password is often the same
    // one who got locked out trying to guess it; otherwise a successful reset
    // still leaves them blocked for the 15-min window.
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.apiToken.updateMany({ where: { userId: row.userId, revoked: false }, data: { revoked: true } }),
  ]);

  log.info({ userId: row.userId }, "Password reset");
  return Response.json({ ok: true });
}
