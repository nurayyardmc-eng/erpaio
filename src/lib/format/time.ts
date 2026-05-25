/**
 * Pure formatting helpers used by dashboard pages.
 *
 * Extracted (Track XXXXX) from src/app/dashboard/settings/page.tsx so the
 * locale-aware relative-time and token-count abbreviations can be tested
 * without React. Both functions are reused across settings sub-sections
 * and would benefit from shared use in other pages.
 */

/**
 * "5m ago" / "5d önce" — relative time from now to an ISO timestamp.
 * `null` input → "—" (placeholder for missing data).
 * Granularity: minute / hour / day (rounded down).
 */
export function formatRelativeTime(
  iso: string | null,
  locale: string,
  now: number = Date.now(),
): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  const hour = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (locale === "en") {
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    if (hour < 24) return `${hour}h ago`;
    return `${day}d ago`;
  }
  // Default + Turkish
  if (min < 1) return "az önce";
  if (min < 60) return `${min}d önce`;
  if (hour < 24) return `${hour}sa önce`;
  return `${day}g önce`;
}

/**
 * Compact token counter for usage badges:
 *   ≥ 1M → "X.YM"
 *   ≥ 1k → "Xk" (no decimal — settings UI is narrow)
 *   else → locale-formatted
 *
 * Note: differs from charts/format.formatN — that uses 1 decimal at the
 * thousand tier; here we drop to 0 decimals because token counts are
 * already noisy and the UI label is small.
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}
