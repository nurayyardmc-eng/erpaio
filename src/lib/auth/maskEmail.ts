/**
 * PII-safe email masking for audit logs + email-change responses.
 *
 * Track LLLLLL — extracted from src/app/api/me/email/request-change/route.ts.
 *
 * Pattern:
 *   "ali@firma.com" → "a***@firma.com"
 *   "a@b.com"       → "*@b.com"
 *   "no-at-sign"    → "***"
 *
 * Differs from lib/notifications/log.maskRecipient (which uses "u***" without
 * the "***" pattern) — this is the email-change-flow variant. They could be
 * unified later if behavior aligns; for now both shipped, both tested.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 1) return `*${domain}`;
  return `${local[0]}***${domain}`;
}
