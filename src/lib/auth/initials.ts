/**
 * Generate avatar initials from a user's display name (falling back to email).
 *
 * Extracted (Track OOOOO) from src/components/UserMenu.tsx so the rule for
 * the avatar fallback (first letter of each space-separated word, max 2
 * chars, uppercased) is documented + tested. UI components everywhere may
 * call this; consistent letters across UserMenu / team pages / mention
 * popovers matters.
 *
 * Algorithm:
 *  1. Prefer `name` if non-empty, otherwise fall back to `email`.
 *  2. Split on whitespace.
 *  3. Take first char of each token (may be undefined for double-spaces;
 *     those produce empty strings and are absorbed by .join).
 *  4. Join and slice to 2 chars.
 *  5. Uppercase.
 *
 * For an email like "ali@firma.com" with no spaces this returns "AL".
 */
export function userInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name && name.trim()) || (email && email.trim()) || "";
  return source
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
