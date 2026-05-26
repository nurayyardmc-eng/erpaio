import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { RATE_LIMITS, enforceIpRateLimit } from "@/lib/rateLimit";
import { jsonError } from "@/lib/i18n/server";
import { sha256Hex } from "@/lib/crypto/hash";
import { isTokenUsable } from "@/lib/auth/oneTimeToken";
const BodySchema = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  // Brute force koruması: IP başına saatte 10 deneme
  const limited = await enforceIpRateLimit(req, RATE_LIMITS.VERIFY_EMAIL);
  if (limited) return limited;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return jsonError(req, "auth.invalidToken", 400);

  const tokenHash = sha256Hex(body.data.token);
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!isTokenUsable(row)) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  childLogger({ component: "verify-email" }).info({ userId: row.userId }, "Email verified");
  return Response.json({ ok: true });
}
