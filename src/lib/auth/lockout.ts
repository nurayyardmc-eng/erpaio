/**
 * Account-lockout state transition, shared by every failed-auth path in
 * lib/auth.ts (wrong password AND wrong MFA/recovery code). Kept as a pure
 * function of (currentCount, now) so the threshold/window is tested once and
 * both call sites stay in lockstep — the MFA path previously skipped the
 * counter entirely, leaving the second factor brute-forceable.
 */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000; // 15 minutes

export function nextLockoutState(
  currentCount: number | null | undefined,
  now: number,
): { failedLoginCount: number; lockedUntil: Date | null } {
  const failedLoginCount = (currentCount ?? 0) + 1;
  const locked = failedLoginCount >= MAX_FAILED_LOGINS;
  return {
    failedLoginCount,
    lockedUntil: locked ? new Date(now + LOCKOUT_MS) : null,
  };
}
