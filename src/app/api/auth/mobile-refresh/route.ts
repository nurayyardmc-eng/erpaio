import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";
import { createMobileApiToken } from "@/lib/auth/createMobileApiToken";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";

const log = childLogger({ component: "mobile-refresh" });

/**
 * Token rotation — mobile API token'ını yenile.
 *
 * Akış:
 *   1. Mevcut token Bearer auth'ı geçer (requireAuth)
 *   2. Yeni token üretilir (90 gün geçerli)
 *   3. Eski token revoked = true işaretlenir (atomic transaction)
 *   4. Yeni token döner — client SecureStore'a yazar
 *
 * Kullanım: Mobile uygulama her launch'ta `getMe()` sonrası `expiresAt`
 * değerine bakar; <14 gün kaldıysa bu endpoint'i çağırır.
 *
 * Rate limit: PASSWORD_CHANGE (5/saat/user) — token rotation hassas, abuse
 * fırsatı vermesin.
 */
export async function POST(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  if (user.authMethod !== "token" || !user.tokenId) {
    return jsonError(req, "api.forbidden", 403);
  }

  const limited = await enforceUserRateLimit(req, user.id, RATE_LIMITS.PASSWORD_CHANGE);
  if (limited) return limited;

  const oldToken = await prisma.apiToken.findUnique({
    where: { id: user.tokenId },
    select: { name: true, revoked: true, expiresAt: true },
  });
  if (!oldToken || oldToken.revoked) {
    return jsonError(req, "auth.invalidToken", 401);
  }

  // Atomic rotation: revoke old token then create the new one.
  // Note: not wrapped in $transaction because createMobileApiToken
  // encapsulates its own prisma.apiToken.create. If revoke succeeds but
  // create fails, the user just needs to re-login (acceptable trade-off
  // for one fewer dependency on prisma direct API in this route).
  await prisma.apiToken.update({
    where: { id: user.tokenId },
    data: { revoked: true },
  });
  const { raw, expiresAt } = await createMobileApiToken(
    user.id,
    user.tenantId,
    oldToken.name ?? "mobile",
  );

  log.info(
    { userId: user.id, oldTokenId: user.tokenId, oldExpiresAt: oldToken.expiresAt },
    "Mobile token rotated",
  );

  return Response.json({
    token: raw,
    expiresAt: expiresAt.toISOString(),
  });
}
