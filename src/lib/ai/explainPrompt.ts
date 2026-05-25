/**
 * Build the user-side prompt for /api/chat/explain (post-query AI summary).
 *
 * Track QQQQQQ — extracted from src/app/api/chat/explain/route.ts so the
 * prompt template + truncation rules can be unit-tested without booting
 * the Anthropic SDK.
 *
 * Truncation:
 *  - SQL clipped to 800 chars (cost — long SQL adds tokens without
 *    helping the summary)
 *  - topRows clipped to 10 rows in JSON (route also enforces max 20
 *    upstream in BodySchema; 10 keeps the prompt short)
 */
export function buildExplainPrompt(
  question: string,
  sql: string,
  topRows: unknown[],
  totalRows: number,
): string {
  return `Soru: "${question}"\nSQL: ${sql.slice(0, 800)}\nToplam satır: ${totalRows}\nİlk satırlar:\n${JSON.stringify(topRows.slice(0, 10))}\n\nKısa Türkçe yorumun:`;
}
