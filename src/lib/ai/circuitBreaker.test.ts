import { describe, it, expect, beforeEach } from "vitest";
import {
  isOpen,
  recordSuccess,
  recordFailure,
  FAILURE_THRESHOLD,
  COOLDOWN_MS,
  CircuitOpenError,
  withCircuitBreaker,
  resetBreaker,
  breakerAllows,
  breakerFailure,
} from "./circuitBreaker";

describe("lib/ai/circuitBreaker — pure transitions", () => {
  it("isOpen true only while openUntil is in the future", () => {
    expect(isOpen({ consecutiveFailures: 0, openUntil: 100 }, 50)).toBe(true);
    expect(isOpen({ consecutiveFailures: 0, openUntil: 100 }, 100)).toBe(false);
    expect(isOpen({ consecutiveFailures: 0, openUntil: 0 }, 50)).toBe(false);
  });

  it("recordSuccess resets to closed", () => {
    expect(recordSuccess()).toEqual({ consecutiveFailures: 0, openUntil: 0 });
  });

  it("failure below threshold just increments", () => {
    const s = recordFailure({ consecutiveFailures: 2, openUntil: 0 }, 1000, 5, COOLDOWN_MS);
    expect(s.consecutiveFailures).toBe(3);
    expect(s.openUntil).toBe(0);
  });

  it("failure reaching threshold opens for cooldown + resets counter", () => {
    const s = recordFailure({ consecutiveFailures: 4, openUntil: 0 }, 1000, 5, 60_000);
    expect(s.openUntil).toBe(61_000);
    expect(s.consecutiveFailures).toBe(0);
  });

  it("default threshold + cooldown constants applied when omitted", () => {
    let s = { consecutiveFailures: FAILURE_THRESHOLD - 1, openUntil: 0 };
    s = recordFailure(s, 5000);
    expect(s.openUntil).toBe(5000 + COOLDOWN_MS);
  });
});

describe("lib/ai/circuitBreaker — live singleton + withCircuitBreaker", () => {
  beforeEach(() => resetBreaker());

  it("passes through a successful call", async () => {
    const out = await withCircuitBreaker(async () => 42);
    expect(out).toBe(42);
    expect(breakerAllows()).toBe(true);
  });

  it("propagates the underlying error and counts the failure", async () => {
    await expect(withCircuitBreaker(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });

  it("opens after FAILURE_THRESHOLD consecutive failures", () => {
    const now = Date.now();
    for (let i = 0; i < FAILURE_THRESHOLD; i++) breakerFailure(now);
    expect(breakerAllows(now)).toBe(false);
  });

  it("rejects fast with CircuitOpenError while open", async () => {
    const now = Date.now();
    for (let i = 0; i < FAILURE_THRESHOLD; i++) breakerFailure(now);
    let called = false;
    await expect(
      withCircuitBreaker(async () => { called = true; return 1; }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(called).toBe(false);
  });

  it("a success closes the breaker again", async () => {
    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) breakerFailure();
    await withCircuitBreaker(async () => "ok");
    expect(breakerAllows()).toBe(true);
  });
});
