/**
 * HTML entity escape — neutralizes the 5 dangerous characters before inserting
 * user / tenant content into HTML templates.
 *
 * Single source of truth (Track FFFFF). Used by:
 *  - lib/reports/render.ts (re-exports as escHtml for back-compat)
 *  - app/api/team/invite/route.ts (invite email tenant name)
 *  - any future template that interpolates untrusted text
 *
 * Why centralize: A regression in any single copy (e.g. forgetting to swap
 * `&` first) re-introduces double-decode XSS. One impl + tests prevents
 * drift.
 *
 * Ampersand MUST be processed first; otherwise replacing `<` → `&lt;` then
 * `&` → `&amp;` would produce `&amp;lt;` (broken).
 */
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]!);
}
