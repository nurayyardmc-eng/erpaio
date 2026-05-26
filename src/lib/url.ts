/**
 * Base URL resolution helper.
 *
 * Track FFFFFFF — same `process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"`
 * pattern was inlined in 11+ routes for password reset / verification /
 * invitation / email-change URLs. A regression here (e.g. typo in fallback)
 * sends emails with broken links.
 *
 * Production NEXTAUTH_URL is set on Vercel; fallback is only used in dev
 * tests when env is missing.
 */
const PRODUCTION_FALLBACK = "https://erpaio.vercel.app";

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? PRODUCTION_FALLBACK;
}

/** Compose a URL path against the base URL. Leading "/" required by convention. */
export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path}`;
}
