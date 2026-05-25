/**
 * Tenant slug generator. Lowercase, ASCII-only, hyphen-separated, max 40 chars.
 *
 * Extracted (Track BBBBB) from src/app/api/auth/signup/route.ts so the
 * normalization rules can be tested in isolation. Slug correctness is a
 * security boundary: malformed slugs end up in URLs (`/t/<slug>`) and the
 * signup retry loop relies on deterministic output for collision detection.
 *
 * Pipeline:
 *  1. lowercase
 *  2. NFD decompose + strip combining diacritics (ş → s, ğ → g, ç → c, …)
 *  3. anything non-[a-z0-9] becomes a single hyphen
 *  4. strip leading/trailing hyphens
 *  5. truncate to 40 chars
 *  6. empty result → random fallback "t-<6 base36 chars>"
 *
 * Note: the random fallback path is non-deterministic; callers using slugify
 * in cryptographic / security contexts must NOT rely on it for entropy.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `t-${Math.random().toString(36).slice(2, 8)}`;
}
