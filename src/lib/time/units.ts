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
