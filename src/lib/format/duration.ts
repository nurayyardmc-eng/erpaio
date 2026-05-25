/**
 * Duration formatter for `durationMs` columns (slow-query log, cron-runs).
 *
 * Extracted (Track AAAAAA) as the single source of truth — same
 * `(ms / 1000).toFixed(1) + "s"` inline pattern was duplicated across 5
 * dashboard/admin pages.
 *
 * Format:
 *   < 1000  → "950ms"   (sub-second stays in ms, no fractional seconds)
 *   ≥ 1000  → "1.5s"    (1 decimal, drops trailing .0 → "2s")
 *   < 0     → "0ms"     (defensive — clock drift / measurement bug)
 *
 * Null input → "—" placeholder (UI common pattern).
 */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds.replace(/\.0$/, "")}s`;
}
