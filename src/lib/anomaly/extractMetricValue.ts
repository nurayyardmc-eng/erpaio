/**
 * Pull the numeric "metric value" out of a single ERP query result row.
 *
 * Anomaly + custom-metric SQL contracts: the query MUST project a column
 * called `metric_value` (or the alias `value` / `val` in the preview-run
 * endpoint, which is more forgiving for user-authored SQL).
 *
 * Track SSSSS — DRY between:
 *  - lib/anomaly/engine.ts → strict ["metric_value"]
 *  - api/custom-metrics/[id]/run/route.ts → ["metric_value", "value", "val"]
 *
 * Returns a discriminated union so callers can differentiate:
 *  - { ok: true, value }                    — extracted
 *  - { ok: false, reason: "missing" }       — alias not in row or null
 *  - { ok: false, reason: "non_numeric" }   — alias found but Number(x) = NaN
 *
 * Empty row (no first row at all) is the caller's concern — that case maps
 * to a different HTTP status ("SQL hiç satır döndürmedi", 422) so we don't
 * conflate it with the schema error.
 */
export type MetricValueResult =
  | { ok: true; value: number }
  | { ok: false; reason: "missing" | "non_numeric" };

export const DEFAULT_METRIC_ALIASES = ["metric_value"] as const;
export const PREVIEW_METRIC_ALIASES = ["metric_value", "value", "val"] as const;

export function extractMetricValue(
  row: Record<string, unknown> | null | undefined,
  aliases: readonly string[] = DEFAULT_METRIC_ALIASES,
): MetricValueResult {
  if (!row) return { ok: false, reason: "missing" };

  let raw: unknown = undefined;
  for (const alias of aliases) {
    const v = row[alias];
    if (v !== undefined && v !== null) {
      raw = v;
      break;
    }
  }
  if (raw === undefined) return { ok: false, reason: "missing" };

  const value = Number(raw);
  if (Number.isNaN(value)) return { ok: false, reason: "non_numeric" };
  return { ok: true, value };
}
