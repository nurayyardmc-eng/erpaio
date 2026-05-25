/**
 * Severity ordering + display helpers.
 *
 * Track JJJJJJ — centralizes the severity rank used in:
 *   - lib/notifications/whatsapp shouldNotify (≥ min severity gate)
 *   - lib/anomaly engine alert evaluation
 *   - UI sort orders
 *
 * Color mappings are intentionally kept per-channel (Slack/Teams use their
 * own palette to match Block Kit and MessageCard themes — see those files).
 * Only the rank + comparator live here.
 */
export type Severity = "low" | "medium" | "high" | "critical";

export const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * `actual >= minimum` semantics on the severity rank. Unknown actual → 0
 * (never above min). Unknown minimum → 4 (effectively block all unless
 * actual is critical).
 */
export function meetsSeverityThreshold(actual: string, minimum: string): boolean {
  return (SEVERITY_RANK[actual] ?? 0) >= (SEVERITY_RANK[minimum] ?? 4);
}

/**
 * Compare two severities for sort order. Higher rank first (descending).
 * Returns negative, 0, or positive per Array.prototype.sort convention.
 */
export function compareSeverity(a: string, b: string): number {
  return (SEVERITY_RANK[b] ?? 0) - (SEVERITY_RANK[a] ?? 0);
}
