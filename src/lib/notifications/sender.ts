/**
 * Per-tenant email sender resolution.
 *
 * Enterprise tenants can customize the visible "From" name via
 * brandingSenderName — anyone else sees the platform default. Track FFFFFF
 * — extracted from src/lib/notifications/email.ts so the plan gate and
 * fallback chain can be unit-tested without Prisma.
 *
 * Rule:
 *  - plan === "enterprise" AND brandingSenderName non-empty
 *      → "<branding> <noreply@<fromDomain>>"
 *  - otherwise
 *      → defaultFrom (e.g. "ERPAIO <noreply@erpaio.app>")
 *
 * Whitespace-only branding name treated as missing.
 */
export function pickEmailSender(
  plan: string | null | undefined,
  brandingSenderName: string | null | undefined,
  defaultFrom: string,
  fromDomain: string,
): string {
  const name = brandingSenderName?.trim();
  if (plan === "enterprise" && name) {
    return `${name} <noreply@${fromDomain}>`;
  }
  return defaultFrom;
}

/**
 * Pure regex extraction: pull the domain portion from a "Name <email>" or
 * raw email From string. Returns null if no @ found.
 */
export function fromDomainOf(fromString: string, fallback: string = "erpaio.app"): string {
  const match = fromString.match(/<?([^>]+@[^>]+)>?/);
  const email = match?.[1];
  if (!email) return fallback;
  const parts = email.split("@");
  return parts[1] ?? fallback;
}
