/**
 * Chat search snippet extractor.
 *
 * Kullanıcının arattığı kelimeyi mesaj içeriğinde bulup etrafına ± padChars
 * karakter kontekst koyar. Sonuçların listesi büyük olduğunda kullanıcının
 * eşleşmeyi yakalaması için kritik.
 *
 * Pure function — DB/network bağımsız, test edilir.
 *
 * Davranış:
 *   - query content'te bulunursa: "...öncesi {match} sonrası..." (ellipsis
 *     yalnızca trim olduğunda)
 *   - query bulunmazsa veya boşsa: content'in ilk maxLen char'ı (truncated
 *     with "..." suffix)
 *   - content tamamen boşsa "" döner
 *   - case-insensitive search
 */

const PAD_CHARS = 60;
const ELLIPSIS = "…";

export interface SnippetResult {
  /** Trimmed snippet, max length güvence. Eşleşme varsa içeriyor. */
  text: string;
  /** Snippet içinde eşleşmenin başladığı index — UI highlight için kullanılır. */
  matchStart: number;
  /** Eşleşmenin uzunluğu (query.length). matchStart === -1 ise 0. */
  matchLength: number;
}

export function extractSnippet(
  content: string,
  query: string,
  maxLen: number = 160,
): SnippetResult {
  if (!content) return { text: "", matchStart: -1, matchLength: 0 };

  const trimmed = content.replace(/\s+/g, " ").trim();
  const q = query.trim();

  // Boş query veya eşleşme yok → ilk maxLen karakter (truncated).
  if (!q) {
    if (trimmed.length <= maxLen) {
      return { text: trimmed, matchStart: -1, matchLength: 0 };
    }
    return {
      text: trimmed.slice(0, maxLen - 1) + ELLIPSIS,
      matchStart: -1,
      matchLength: 0,
    };
  }

  const lcContent = trimmed.toLowerCase();
  const lcQuery = q.toLowerCase();
  const idx = lcContent.indexOf(lcQuery);

  if (idx === -1) {
    if (trimmed.length <= maxLen) {
      return { text: trimmed, matchStart: -1, matchLength: 0 };
    }
    return {
      text: trimmed.slice(0, maxLen - 1) + ELLIPSIS,
      matchStart: -1,
      matchLength: 0,
    };
  }

  // Eşleşme bulundu — etrafına PAD_CHARS koy + maxLen sınırı uygula.
  const idealStart = Math.max(0, idx - PAD_CHARS);
  const idealEnd = Math.min(trimmed.length, idx + q.length + PAD_CHARS);

  let snippet = trimmed.slice(idealStart, idealEnd);
  let matchStartInSnippet = idx - idealStart;
  const trimmedStart = idealStart > 0;
  const trimmedEnd = idealEnd < trimmed.length;
  if (trimmedStart) {
    snippet = ELLIPSIS + snippet;
    matchStartInSnippet += ELLIPSIS.length;
  }
  if (trimmedEnd) snippet = snippet + ELLIPSIS;

  // maxLen aşıyorsa middle-truncate (ender ama defensive).
  if (snippet.length > maxLen) {
    const overflow = snippet.length - maxLen;
    snippet = snippet.slice(0, snippet.length - overflow - 1) + ELLIPSIS;
  }

  return {
    text: snippet,
    matchStart: matchStartInSnippet,
    matchLength: q.length,
  };
}

/**
 * Server-side normalize: kullanıcı query'sini DB filter'a koymadan önce.
 * Trim + leading/trailing whitespace temizler. Boş veya 1 char ise null
 * (route boş query'ye full list yerine empty döner — UX karar).
 */
export function normalizeSearchQuery(q: string | null | undefined): string | null {
  if (!q) return null;
  const trimmed = q.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 80); // max 80 char (DoS koruma)
}
