// Pure helpers for the auth proxy (src/proxy.ts). Extracted so the routing
// rules (which paths are public, which bypass maintenance, which landing HTML
// to serve) can be unit-tested without booting NextAuth/Next.js middleware.
//
// IMPORTANT: src/proxy.ts re-imports these constants — keep the list here as
// the single source of truth.

export const PUBLIC_PATHS = [
  "/login",
  "/privacy",
  "/terms",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/docs",
  "/status",
  "/accept-invite",
  "/verify-email",
  "/maintenance",
];

export const MAINTENANCE_BYPASS = ["/maintenance", "/status", "/api/health", "/api/cron"];

export const SUPPORTED_LANDING_LANGS = ["tr", "en", "ar"] as const;

/** Public path = exact match OR child path (e.g. `/docs/api`). */
export function isPathPublic(path: string): boolean {
  if (path === "/") return true;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function isMaintenanceBypassed(path: string): boolean {
  return MAINTENANCE_BYPASS.some((p) => path === p || path.startsWith(p + "/"));
}

export function isApiPath(path: string): boolean {
  return path.startsWith("/api");
}

/**
 * Map the `erpaio_lang` cookie value to a static landing HTML file.
 * Unknown / missing language → default English landing.
 */
export function pickLandingFile(lang: string | undefined | null): string {
  if (lang === "tr") return "/landing-tr.html";
  if (lang === "ar") return "/landing-ar.html";
  return "/landing.html";
}

export function isSupportedLandingLang(lang: string | undefined | null): boolean {
  if (!lang) return false;
  return (SUPPORTED_LANDING_LANGS as readonly string[]).includes(lang);
}
