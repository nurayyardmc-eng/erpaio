/**
 * Render a 0..1 fraction as an integer percentage badge.
 *
 * Extracted (Track BBBBBB) as single source of truth — `(x * 100).toFixed(0)`
 * and `Math.round(x * 100)` inline patterns appeared in 8+ pages
 * (admin/health-scores, admin/notifications, dashboard/saved,
 * dashboard/notification-log, dashboard/chat).
 *
 * Defaults:
 *  - Rounds via Math.round (closer-half-up). `.toFixed(0)` matches except
 *    for negative-zero edge — Math.round is the documented choice.
 *  - Null/undefined → "—" placeholder.
 *  - Out-of-range NOT clamped — 1.5 → 150% (caller may pre-clamp).
 *
 * Output is the integer ONLY (no "%" suffix) so callers can compose with
 * locale-aware prefixes like "%5" (TR) vs "5%" (EN).
 */
export function formatPercentInt(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined) return "—";
  if (Number.isNaN(fraction)) return "—";
  return String(Math.round(fraction * 100));
}

/**
 * "5%" — formatPercentInt + suffix. Common case shorthand.
 */
export function formatPercent(fraction: number | null | undefined): string {
  const n = formatPercentInt(fraction);
  return n === "—" ? n : `${n}%`;
}
