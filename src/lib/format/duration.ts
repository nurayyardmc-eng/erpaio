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

/**
 * Seconds formatter with configurable precision (default 2 decimals).
 *
 * Track DDDDDDDDD — slow-query detayinda formatDurationMs (1 ondalik)
 * yetersizdi; debug icin "2.34s" gibi 2-decimal precision gerekli. Bu
 * helper o use case'i karsilar.
 *
 * Null/undefined → "—". Negatif → 0.
 *
 *   formatSeconds(2345) → "2.35s"
 *   formatSeconds(2345, 1) → "2.3s"
 *   formatSeconds(50) → "0.05s"
 */
export function formatSeconds(ms: number | null | undefined, precision: number = 2): string {
  if (ms === null || ms === undefined) return "—";
  const clamped = Math.max(0, ms);
  return `${(clamped / 1000).toFixed(precision)}s`;
}
