/**
 * Create a fresh email-verification token (24-hour TTL) and persist its hash.
 *
 * Track ZZZZZZZZZZZ — signup + send-verification AYNI 4-satirlik pattern:
 *   const rawToken = generateSecureToken();
 *   const tokenHash = sha256Hex(rawToken);
 *   await prisma.emailVerificationToken.create({
 *     data: { userId, tokenHash, expiresAt: daysFromNow(1) },
 *   });
 *
 * SECURITY: plaintext token sadece email link icinde gosterilir; DB
 * sha256 hash saklar (verify-email tarafinda lookup tokenHash uzerinden).
 * 24h expiry token theft window'unu sinirli tutar; user kacirirsa
 * /api/auth/send-verification yeni token uretebilir.
 *
 * Tek noktada token shape + expiry policy + DB write — gelecek
 * algoritma migration (HMAC, JWT vb) ya da TTL ayari tek dosyada.
 */
import { prisma } from "@/lib/db/prisma";
import { sha256Hex } from "@/lib/crypto/hash";
import { generateSecureToken } from "@/lib/crypto/token";
import { daysFromNow } from "@/lib/time/units";

const EMAIL_VERIFICATION_TTL_DAYS = 1;

export interface EmailVerificationTokenResult {
  /** Plaintext token — sadece email link'inde gosterilir. */
  raw: string;
  /** Token expiry — 24 saat sonrasi. */
  expiresAt: Date;
}

export async function createEmailVerificationToken(
  userId: string,
): Promise<EmailVerificationTokenResult> {
  const raw = generateSecureToken();
  const tokenHash = sha256Hex(raw);
  const expiresAt = daysFromNow(EMAIL_VERIFICATION_TTL_DAYS);

  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { raw, expiresAt };
}
