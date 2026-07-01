import { describe, it, expect } from "vitest";
import { nextLockoutState, MAX_FAILED_LOGINS, LOCKOUT_MS } from "./lockout";

const NOW = 1_000_000_000_000;

describe("auth/lockout/nextLockoutState", () => {
  it("increments the counter by one", () => {
    expect(nextLockoutState(0, NOW).failedLoginCount).toBe(1);
    expect(nextLockoutState(3, NOW).failedLoginCount).toBe(4);
  });

  it("treats null/undefined as 0", () => {
    expect(nextLockoutState(null, NOW).failedLoginCount).toBe(1);
    expect(nextLockoutState(undefined, NOW).failedLoginCount).toBe(1);
  });

  it("does NOT lock below the threshold", () => {
    expect(nextLockoutState(MAX_FAILED_LOGINS - 2, NOW).lockedUntil).toBeNull();
  });

  it("locks exactly at the threshold, window = now + LOCKOUT_MS", () => {
    const r = nextLockoutState(MAX_FAILED_LOGINS - 1, NOW);
    expect(r.failedLoginCount).toBe(MAX_FAILED_LOGINS);
    expect(r.lockedUntil).toEqual(new Date(NOW + LOCKOUT_MS));
  });

  it("stays locked above the threshold", () => {
    expect(nextLockoutState(MAX_FAILED_LOGINS + 3, NOW).lockedUntil).not.toBeNull();
  });
});
