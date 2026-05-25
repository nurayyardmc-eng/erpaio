/**
 * Truncate ERP query result rows for the chat response.
 *
 * The 500-row cap (Track JJJJJ) is a UX + payload-size limit, not a security
 * one — the client can request more by exporting the underlying SQL via
 * Saved Queries → CSV/XLSX. Inline display would lag the browser with
 * larger payloads (~5 MB JSON typical for 500 wide rows).
 *
 * DRY between chat/route.ts and chat/stream/route.ts.
 */
export const DEFAULT_ROW_LIMIT = 500;

export interface TruncateResult<T> {
  results: T[];
  total: number;
  truncated: boolean;
  rowLimit: number;
}

export function truncateRows<T>(rows: T[], limit: number = DEFAULT_ROW_LIMIT): TruncateResult<T> {
  return {
    results: rows.slice(0, limit),
    total: rows.length,
    truncated: rows.length > limit,
    rowLimit: limit,
  };
}
