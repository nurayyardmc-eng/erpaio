/**
 * Pure validator for one-time-use tokens (password reset, email
 * verification, email change).
 *
 * Track QQQQQQQQ — 3 auth route IDENTIK 3-state check yapiyordu:
 *   if (!row || row.usedAt || row.expiresAt < new Date()) {
 *     return jsonError(req, "auth.invalidToken", 400);
 *   }
 *
 * Drift riski: yeni bir invariant eklemek (orn. ip-binding,
 * scope-binding) gerekirse 3 yerde dolaşmak gerekirdi. Pure helper'da
 * test edilebilir + tek noktada genişletilebilir.
 *
 * `usedAt` field-name'i tum 3 tabloda standart (PasswordResetToken +
 * EmailVerificationToken + EmailChangeToken Prisma schema). `expiresAt`
 * de aynı.
 */

export interface OneTimeToken {
  usedAt: Date | null;
  expiresAt: Date;
}

/**
 * True if the row exists, has not been used, and has not expired.
 * `now` defaults to `Date.now()` — accept Date input for test
 * determinism.
 */
export function isTokenUsable<T extends OneTimeToken>(
  row: T | null | undefined,
  now: Date = new Date(),
): row is T {
  if (!row) return false;
  if (row.usedAt) return false;
  if (row.expiresAt < now) return false;
  return true;
}
