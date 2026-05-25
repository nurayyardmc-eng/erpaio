/**
 * Build a date-stamped export filename: "erpaio-<slug>-YYYY-MM-DD.<ext>".
 *
 * Extracted (Track DDDDDD) — same inline pattern appeared in 16+ admin
 * and dashboard pages for CSV/XLSX/JSON downloads:
 *   `const ts = new Date().toISOString().slice(0, 10);`
 *   `downloadCsv(`erpaio-saved-${ts}.csv`, csv)`
 *
 * UTC date intentionally (matches server-side cron + audit log dates).
 * Customer is in tr-TR but filename comparison across systems benefits
 * from UTC consistency.
 */

export function exportFilenameTimestamp(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Compose an ERPAIO export filename.
 *
 *   exportFilename("saved-queries", "csv") → "erpaio-saved-queries-2026-05-26.csv"
 *
 * Slug is inserted verbatim — caller validates if user-supplied.
 */
export function exportFilename(slug: string, extension: string, now: Date = new Date()): string {
  const ts = exportFilenameTimestamp(now);
  return `erpaio-${slug}-${ts}.${extension}`;
}
