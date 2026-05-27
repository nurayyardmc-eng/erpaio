/**
 * Extract column names from a query result. Empty array if no rows.
 *
 * Track EEEEEEEEEEE — 4 site AYNI pattern'i tekrar ediyordu:
 *   * chat/route: `rows.length > 0 ? Object.keys(rows[0]) : []`
 *   * chat/stream: `rows.length > 0 ? Object.keys(rows[0]) : []`
 *   * chat/run-sql: `rows.length > 0 ? Object.keys(rows[0]) : []`
 *   * scheduled-reports/[id]/run: `sample[0] ? Object.keys(sample[0]) : []`
 *
 * Bu shape ERP query response'unun UI/API kontratinin parcasi —
 * columns array tek yerden uretmek client-side rendering tutarliligini
 * korur (kolon sirasi v8 engine'in object key iteration sirasinda
 * deterministic).
 *
 * Rows tipsiz Record<string, unknown>[] kabul edilir; queryERP zaten
 * bu shape'i doner. Optional/null rows: bos array doner (defensive).
 */
export function extractColumns(
  rows: ReadonlyArray<Record<string, unknown>> | null | undefined,
): string[] {
  if (!rows || rows.length === 0) return [];
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first);
}
