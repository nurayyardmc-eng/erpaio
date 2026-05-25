/**
 * Pure helpers for building per-table embedding text payloads.
 *
 * Extracted (Track KKKKK) from src/app/api/embeddings/build/route.ts so the
 * group + text assembly logic can be tested without queryERP or Prisma.
 * The output text is fed verbatim into deterministicEmbed → cosine
 * similarity search; format regressions silently degrade retrieval quality
 * (wrong tables match user questions).
 */
export interface SchemaRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

/**
 * Group raw INFORMATION_SCHEMA rows by TABLE_NAME, formatting each column
 * as `<name>:<type>`. Insertion order of tables preserved (Map default).
 */
export function groupColumnsByTable(rows: SchemaRow[]): Map<string, string[]> {
  const tableMap = new Map<string, string[]>();
  for (const r of rows) {
    if (!tableMap.has(r.TABLE_NAME)) tableMap.set(r.TABLE_NAME, []);
    tableMap.get(r.TABLE_NAME)!.push(`${r.COLUMN_NAME}:${r.DATA_TYPE}`);
  }
  return tableMap;
}

/**
 * Build the embedding payload string for a single table.
 *
 * Format: `<table> <description> <aliases> <first10 cols>` then `.trim()`.
 * - Description / aliases pulled from ERP profile metadata; empty strings
 *   when no profile entry (canonical schema tables only).
 * - Only first 10 columns to keep embeddings tight — additional columns
 *   add noise without improving retrieval (long-tail columns rarely drive
 *   user-question routing).
 */
export function buildEmbeddingText(
  table: string,
  description: string,
  aliases: string[],
  columns: string[],
): string {
  return `${table} ${description} ${aliases.join(", ")} ${columns.slice(0, 10).join(" ")}`.trim();
}
