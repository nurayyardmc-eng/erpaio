/**
 * Time unit constants in milliseconds.
 *
 * Track PPPPPPP — single source of truth for day-millisecond math. Previously
 * each consumer file (cron/retention, trial/warningEmail, trial/banner,
 * nps/eligibility) defined its own `ONE_DAY_MS` / `DAY_MS` / `dayMs` const.
 * The value never differs (all `24 * 60 * 60 * 1000`), but duplicating the
 * literal across files invites drift if someone "fixes" one site without the
 * others.
 *
 * Why not `Temporal.Duration` / a date library: 86_400_000 ms is fixed-width
 * day-arithmetic for cron windows and retention cutoffs. DST/leap-second
 * correctness is not relevant for these consumers — they all want a literal
 * 86.4M-ms window relative to `Date.now()`.
 *
 * Tested in `units.test.ts` to guard against accidental edits.
 */

/** One minute in milliseconds (60 * 1000). */
export const ONE_MINUTE_MS = 60_000;

/** One hour in milliseconds (60 * 60 * 1000). */
export const ONE_HOUR_MS = 60 * 60_000;

/** One day in milliseconds (24 * 60 * 60 * 1000 = 86_400_000). */
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * `Date` exactly N days in the future relative to `now`.
 *
 * Used by token/trial expiry sites: signup trial end, email-verification
 * expiry (+24h), team invite (+7d), mobile refresh tokens (+90d).
 *
 * `now` arg defaults to `Date.now()` so production callers can drop in
 * without passing it; tests inject a frozen clock for determinism.
 *
 * Track QQQQQQQ — extracted to replace 7 inline `new Date(Date.now() + N *
 * 24 * 60 * 60_000)` sites with a self-documenting helper.
 */
export function daysFromNow(days: number, now: number = Date.now()): Date {
  return new Date(now + days * ONE_DAY_MS);
}

/**
 * `Date` exactly N days in the past relative to `now`.
 *
 * Used by analytics windowing sites: health dashboard last-24h cards,
 * admin recent-activity scrolls, cron health digest, suggested-alerts
 * 30-day baseline.
 *
 * See `daysFromNow` for the rationale on the `now` parameter.
 */
export function daysAgo(days: number, now: number = Date.now()): Date {
  return new Date(now - days * ONE_DAY_MS);
}

/**
 * Coerce a `Date | string | number` to a `Date`. A `Date` passes through
 * unchanged; anything else goes through `new Date(...)`.
 *
 * Replaces the `x instanceof Date ? x : new Date(x)` ternary that was inlined
 * across the date formatters/classifiers (format/time, chat/exportMarkdown,
 * schema/age, budget/format). Callers keep their own NaN guard afterwards —
 * this is pure coercion only, so an invalid input yields an Invalid Date that
 * the caller can detect via `Number.isNaN(d.getTime())`.
 */
export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}
