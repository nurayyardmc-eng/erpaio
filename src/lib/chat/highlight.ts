/**
 * Split a text into 3 pieces for highlighted snippet rendering.
 *
 * Extracted (Track WWWWW) from src/app/dashboard/chat/page.tsx so the slice
 * arithmetic can be unit-tested without JSX. The chat session search panel
 * uses this to render `<mark>` around a matched substring.
 *
 * `matchStart` of -1 (or any negative) or `matchLength` ≤ 0 disables
 * highlighting — entire text returned as `before`, empty match + after.
 * This mirrors the renderer's no-highlight branch.
 *
 * Out-of-bounds indices are silently clamped by String.prototype.slice;
 * we do not throw because search snippet offsets come from server data
 * that may differ from the eventually-rendered string.
 */
export interface HighlightParts {
  before: string;
  match: string;
  after: string;
}

export function sliceHighlight(
  text: string,
  matchStart: number,
  matchLength: number,
): HighlightParts {
  if (matchStart < 0 || matchLength <= 0) {
    return { before: text, match: "", after: "" };
  }
  return {
    before: text.slice(0, matchStart),
    match: text.slice(matchStart, matchStart + matchLength),
    after: text.slice(matchStart + matchLength),
  };
}
