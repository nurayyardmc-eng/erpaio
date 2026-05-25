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
