/**
 * Threshold comparison primitive used by:
 *  - lib/anomaly/detectors.ts (`detectThreshold` rules)
 *  - app/api/cron/watchlists/route.ts (watchlist trigger check)
 *  - lib/anomaly/customMetrics (DB-stored tenant rules)
 *
 * Track XXXX — extracted to enforce DRY across the codebase. A regression
 * in any single copy (e.g. flipping lt/gt) would mis-fire alerts; one
 * source of truth + tests catches that.
 *
 * Returns false for unknown operators rather than throwing — caller paths
 * may load `op` from DB / JSON config and shouldn't crash on stale data.
 */
export const THRESHOLD_OPS = ["lt", "lte", "gt", "gte", "eq"] as const;
export type ThresholdOp = (typeof THRESHOLD_OPS)[number];

export function compareThreshold(op: string, value: number, threshold: number): boolean {
  switch (op) {
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "eq": return value === threshold;
    default: return false;
  }
}

/** Human-readable label for a threshold op (TR-localized symbol set). */
export function thresholdOpSymbol(op: ThresholdOp): string {
  return { lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=" }[op];
}

/**
 * Pulls the first numeric value out of a watchlist SQL result row.
 *
 * Watchlist users phrase the question naturally, so the SQL projection may
 * include a label column ("Marka", "Tarih") before the metric. We scan
 * columns in object-key order and return the first numeric value — either a
 * JS number or a numeric string (pg serializes bigint/numeric as strings).
 *
 * Returns null if no numeric column exists — caller maps this to a 422
 * "could not extract a numeric value" response.
 *
 * Track ZZZZ — extracted to share between watchlists cron + preview route.
 */
export function extractFirstNumeric(row: Record<string, unknown> | undefined | null): number | null {
  if (!row) return null;
  for (const v of Object.values(row)) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    // pg returns bigint / numeric / decimal columns as STRINGS (to avoid
    // precision loss) — so COUNT(*), SUM(...), AVG(...) arrive as "800",
    // "1234.56" etc. Parse plain numeric strings so those (the most common
    // watchlist metrics) are extractable. The strict pattern avoids treating
    // dates, codes or text labels ("2026-05-04", "SKU-12", "Nike") as numbers.
    if (typeof v === "string") {
      const s = v.trim();
      if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}
