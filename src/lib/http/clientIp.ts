/**
 * Extract the originating client IP from an incoming Request.
 *
 * Convention (Vercel + most CDN edge):
 *   X-Forwarded-For: "<client>, <proxy1>, <proxy2>"
 *   The first comma-separated value is the trusted client IP.
 *
 * Extracted (Track RRRRR) as the single source of truth — same inline
 * snippet was duplicated across 8 sites:
 *   - api/auth/signup, mobile-login, verify-email, forgot-password,
 *     verify-email-change, reset-password
 *   - lib/auth/consent
 *   - lib/audit/activity
 *
 * Returns "unknown" instead of null so DB columns (NOT NULL) and audit
 * logs always have a value — null leakage in a forgotten branch would
 * crash some inserts.
 */
export function extractClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const xri = req.headers.get("x-real-ip")?.trim();
  if (xri) return xri;
  return "unknown";
}
