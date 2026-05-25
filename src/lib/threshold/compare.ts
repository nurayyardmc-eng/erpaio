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
export type ThresholdOp = "lt" | "lte" | "gt" | "gte" | "eq";

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
