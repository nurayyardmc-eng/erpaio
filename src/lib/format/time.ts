/**
 * Pure formatting helpers used by dashboard pages.
 *
 * Extracted (Track XXXXX) from src/app/dashboard/settings/page.tsx so the
 * locale-aware relative-time and token-count abbreviations can be tested
 * without React. Both functions are reused across settings sub-sections
 * and would benefit from shared use in other pages.
 */

import { toDate } from "@/lib/time/units";

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
 * Locale-aware absolute timestamp ("DD.MM.YYYY HH:MM:SS" TR / "M/D/YYYY" EN).
 *
 * Extracted (Track EEEEEE) — 14 inline `new Date(x).toLocaleString("tr-TR")`
 * sites across admin + dashboard pages. Some use locale-conditional form,
 * others hardcode "tr-TR". Unified here.
 *
 * Locale arg accepts the i18n string ("en"/"tr"/...) and maps to the right
 * BCP-47 tag. Unknown → "tr-TR" default.
 *
 * Null/undefined/invalid date → "—" placeholder.
 */
export function formatTimestamp(
  iso: string | Date | null | undefined,
  locale: string = "tr",
): string {
  if (!iso) return "—";
  const date = toDate(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const tag = locale === "en" ? "en-US" : "tr-TR";
  return date.toLocaleString(tag);
}

/**
 * Date-only formatter ("DD.MM.YYYY" TR / "M/D/YYYY" EN) — no time.
 *
 * Track PPPPPPPP — 8 admin/dashboard page'inde inline
 * `new Date(x).toLocaleDateString("tr-TR")` patterni. formatTimestamp'in
 * date-only kuzeni; chat history kartlari, team member rolleri, billing
 * reset gunleri vb saatlik bilgi gerekmediginde kullaniliyor.
 *
 * Null/undefined/invalid → "—".
 */
export function formatDate(
  iso: string | Date | null | undefined,
  locale: string = "tr",
): string {
  if (!iso) return "—";
  const date = toDate(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const tag = locale === "en" ? "en-US" : "tr-TR";
  return date.toLocaleDateString(tag);
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
