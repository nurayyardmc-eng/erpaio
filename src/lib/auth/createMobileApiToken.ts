/**
 * Create a new 90-day mobile API token. Returns the plaintext token + expiry.
 *
 * Track WWWWWWWWWWW — mobile-login + mobile-refresh route AYNI 6-satirlik
 * token-create-with-hash sequence kullaniyordu:
 *   const raw = generateApiToken();
 *   const tokenHash = hashApiToken(raw);
 *   const expiresAt = daysFromNow(90);
 *   await prisma.apiToken.create({ data: { userId, tenantId, tokenHash, name, expiresAt } });
 *
 * SECURITY: plaintext token sadece bir kez UI'da gosterilir; DB'de hash
 * saklanir (lookup tokenHash uzerinden). 90 gun expiry default; rotation
 * 14 gun kala client tarafindan tetiklenir.
 *
 * Tek noktada: token shape + expiry policy + DB write kontrati test
 * edilebilir, mobile auth surface'inde drift onlenir.
 */
import { prisma } from "@/lib/db/prisma";
import { daysFromNow } from "@/lib/time/units";
import { generateApiToken, hashApiToken } from "./apiToken";

const MOBILE_TOKEN_TTL_DAYS = 90;

export interface MobileApiTokenResult {
  /** Plaintext token — UI'da bir kez gosterilir, sonra kayipdir. */
  raw: string;
  /** Token expiry — 90 gun sonrasi. */
  expiresAt: Date;
}

export async function createMobileApiToken(
  userId: string,
  tenantId: string,
  name: string,
): Promise<MobileApiTokenResult> {
  const raw = generateApiToken();
  const tokenHash = hashApiToken(raw);
  const expiresAt = daysFromNow(MOBILE_TOKEN_TTL_DAYS);

  await prisma.apiToken.create({
    data: { userId, tenantId, tokenHash, name, expiresAt },
  });

  return { raw, expiresAt };
}
