/**
 * Constant-time string equality.
 *
 * Used to compare bearer cron secrets without leaking length-position info
 * via early-exit branch timing. Length mismatch is an immediate false (the
 * length itself isn't secret — the request would not have a matching token
 * anyway), but identical-length compares iterate all chars.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Pure bearer-header verifier for cron auth.
 *
 * Track SSSS extraction: separates the timing-safe + env-secret + missing-
 * header decision tree from verifyCronAuth's NextAuth/Prisma fallback path
 * so the hot path can be unit-tested without mocking.
 *
 * Returns:
 *  - { matched: true, ok: true } — header present, matches CRON_SECRET
 *  - { matched: true, ok: false, reason: "..." } — header present but rejected
 *  - { matched: false }            — no Authorization header (caller does fallback)
 */
export function verifyBearerHeader(
  authHeader: string | null,
  cronSecret: string | undefined,
):
  | { matched: false }
  | { matched: true; ok: true }
  | { matched: true; ok: false; reason: string } {
  if (!authHeader) return { matched: false };
  if (!cronSecret) {
    return { matched: true, ok: false, reason: "CRON_SECRET not configured" };
  }
  const expected = `Bearer ${cronSecret}`;
  if (timingSafeEqual(authHeader, expected)) {
    return { matched: true, ok: true };
  }
  return { matched: true, ok: false, reason: "Invalid cron secret" };
}
