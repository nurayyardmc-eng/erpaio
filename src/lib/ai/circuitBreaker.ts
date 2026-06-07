// Sprint P26 — circuit breaker for Anthropic API calls.
//
// If Anthropic starts failing (outage, 5xx storm, network), hammering it
// with every chat request wastes latency + budget and degrades UX. This
// breaker trips after N consecutive failures and "opens" for a cooldown
// window, during which calls are rejected instantly. After the cooldown a
// single trial is allowed (half-open); success closes the breaker, failure
// re-opens it.
//
// The state transitions are pure functions (unit-tested); a module-level
// singleton holds the live state and withCircuitBreaker() wires it to real
// calls.

export interface BreakerState {
  consecutiveFailures: number;
  /** epoch ms until which the breaker is open; 0 = closed. */
  openUntil: number;
}

export const FAILURE_THRESHOLD = 5;
export const COOLDOWN_MS = 60_000;

export class CircuitOpenError extends Error {
  constructor() {
    super("AI service temporarily unavailable (circuit open)");
    this.name = "CircuitOpenError";
  }
}

/** Pure: is the breaker currently open (rejecting) at `now`? */
export function isOpen(state: BreakerState, now: number): boolean {
  return state.openUntil > now;
}

/** Pure: a success resets failures and closes the breaker. */
export function recordSuccess(): BreakerState {
  return { consecutiveFailures: 0, openUntil: 0 };
}

/**
 * Pure: a failure increments the counter; once it reaches the threshold
 * the breaker opens for the cooldown window (and the counter resets so the
 * next post-cooldown failure needs another full streak to re-trip).
 */
export function recordFailure(
  state: BreakerState,
  now: number,
  threshold: number = FAILURE_THRESHOLD,
  cooldownMs: number = COOLDOWN_MS,
): BreakerState {
  const failures = state.consecutiveFailures + 1;
  if (failures >= threshold) {
    return { consecutiveFailures: 0, openUntil: now + cooldownMs };
  }
  return { consecutiveFailures: failures, openUntil: state.openUntil };
}

// ---- Live singleton ----

let live: BreakerState = { consecutiveFailures: 0, openUntil: 0 };

/** Test/escape hatch — reset the live breaker. */
export function resetBreaker(): void {
  live = { consecutiveFailures: 0, openUntil: 0 };
}

export function breakerAllows(now: number = Date.now()): boolean {
  return !isOpen(live, now);
}

export function breakerSuccess(): void {
  live = recordSuccess();
}

export function breakerFailure(now: number = Date.now()): void {
  live = recordFailure(live, now);
}

/**
 * Wrap an Anthropic (or any flaky upstream) call with the breaker. Rejects
 * immediately with CircuitOpenError while open; otherwise runs fn and
 * reports the outcome to the breaker.
 */
export async function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  if (!breakerAllows()) throw new CircuitOpenError();
  try {
    const result = await fn();
    breakerSuccess();
    return result;
  } catch (err) {
    breakerFailure();
    throw err;
  }
}
