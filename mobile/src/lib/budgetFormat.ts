/**
 * Tenant token usage formatters — mobile sürümü.
 *
 * SYNC NOTE: Web ikizi `src/lib/budget/format.ts`. Vitest mobile/'i dışlıyor;
 * web tarafında test'lenir. İki dosya birebir aynı kalmalı (helper change
 * yapılırsa her ikisini güncelle).
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

export type BudgetStatusLevel = "ok" | "warning" | "danger";

export function budgetStatusLevel(percentUsed: number): BudgetStatusLevel {
  if (!Number.isFinite(percentUsed) || percentUsed <= 60) return "ok";
  if (percentUsed <= 85) return "warning";
  return "danger";
}

export function daysUntilReset(resetsOn: string | Date, now: Date = new Date()): number {
  const target = resetsOn instanceof Date ? resetsOn : new Date(resetsOn);
  if (Number.isNaN(target.getTime())) return 0;
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60_000));
}
