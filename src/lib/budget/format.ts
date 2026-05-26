import { ONE_DAY_MS } from "@/lib/time/units";

/**
 * Tenant token usage formatters — web + mobile UI'da kullanılır.
 *
 * Pure functions — DB/network bağımsız, test edilir. Tenant usage panelinin
 * "1.2M / 2M kullanıldı · 18 gün sonra sıfırlanır" renderer'ı için kritik.
 */

/**
 * Token sayısını insan-okuyabilir formata çevirir.
 *   < 1000     → "234"
 *   < 1_000_000 → "12.3K" (1 ondalık)
 *   ≥ 1_000_000 → "1.2M"  (1 ondalık)
 *
 * Trailing ".0" temizlenir ("12K" "12M" gibi düz görünür).
 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs < 1000) return Math.round(n).toString();
  if (abs < 1_000_000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Budget status renderer — eşik tablosu:
 *   percentUsed ≤ 60  → "ok"      yeşil
 *   percentUsed ≤ 85  → "warning" amber
 *   percentUsed > 85  → "danger"  kırmızı
 *
 * Pure helper test-friendly.
 */
export type BudgetStatusLevel = "ok" | "warning" | "danger";

export function budgetStatusLevel(percentUsed: number): BudgetStatusLevel {
  if (!Number.isFinite(percentUsed) || percentUsed <= 60) return "ok";
  if (percentUsed <= 85) return "warning";
  return "danger";
}

/**
 * resetsOn (ISO string veya Date) → kalan gün sayısı (floor, ≥ 0).
 * Geçmiş tarih → 0 (defensive, edge case clock skew).
 */
export function daysUntilReset(resetsOn: string | Date, now: Date = new Date()): number {
  const target = resetsOn instanceof Date ? resetsOn : new Date(resetsOn);
  if (Number.isNaN(target.getTime())) return 0;
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / ONE_DAY_MS);
}
