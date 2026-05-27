/**
 * Create a fresh password-reset token (1-hour TTL) and persist its hash.
 *
 * Track EEEEEEEEEEEE — forgot-password route inline tasiyordu:
 *   const rawToken = generateSecureToken();
 *   const tokenHash = sha256Hex(rawToken);
 *   const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
 *   await prisma.passwordResetToken.create({
 *     data: { userId, tokenHash, expiresAt },
 *   });
 *
 * SECURITY: plaintext token sadece email link icinde gosterilir; DB
 * sha256 hash saklar (reset-password tarafinda lookup tokenHash uzerinden).
 * 1h expiry — email verification (24h) ile karsilastirmali olarak DAHA
 * KISA cunku password reset daha kritik bir security boundary
 * (compromised email account -> account takeover). 1 saat icinde
 * fark edilmesi gereken bir aksiyondur.
 *
 * createEmailVerificationToken (Track ZZZZZZZZZZZ) ile symmetric API.
 */
import { prisma } from "@/lib/db/prisma";
import { sha256Hex } from "@/lib/crypto/hash";
import { generateSecureToken } from "@/lib/crypto/token";
import { ONE_HOUR_MS } from "@/lib/time/units";

const PASSWORD_RESET_TTL_MS = ONE_HOUR_MS;

export interface PasswordResetTokenResult {
  /** Plaintext token — sadece email link'inde gosterilir. */
  raw: string;
  /** Token expiry — 1 saat sonrasi. */
  expiresAt: Date;
}

export async function createPasswordResetToken(
  userId: string,
): Promise<PasswordResetTokenResult> {
  const raw = generateSecureToken();
  const tokenHash = sha256Hex(raw);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { raw, expiresAt };
}
