/**
 * Reusable Zod schemas for auth + user input boundaries.
 *
 * Track CCCCCCC — extracted constants for password + email validation so
 * the rules (min 8, max 200, RFC-email) stay consistent across signup /
 * reset / accept-invite / password change.
 *
 * Drift example: if signup tightens password to min 12 but reset-password
 * stays at 8, users can bypass the stronger rule via reset flow.
 */
import { z } from "zod";

/** Standard password: min 8, max 200 chars. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export function zPassword() {
  return z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
}

/** Standard email: RFC validated, max 200 chars (Prisma User.email column). */
export const EMAIL_MAX_LENGTH = 200;

export function zEmail(maxLength: number = EMAIL_MAX_LENGTH) {
  return z.string().email().max(maxLength);
}

/**
 * Severity enum (matches anomaly engine + alerts).
 * Track EEEEEEE — central source of truth for severity values.
 */
export const SEVERITY_VALUES = ["low", "medium", "high", "critical"] as const;
export type SeverityValue = (typeof SEVERITY_VALUES)[number];
export function zSeverity() {
  return z.enum(SEVERITY_VALUES);
}

/**
 * Team role values used in invitation + role-change endpoints.
 * `owner` excluded from invitation flow (owners cannot be invited;
 * they're created at signup).
 */
export const TEAM_ROLE_VALUES = ["viewer", "admin", "owner"] as const;
export const INVITE_ROLE_VALUES = ["viewer", "admin"] as const;
export function zTeamRole() {
  return z.enum(TEAM_ROLE_VALUES);
}
export function zInviteRole() {
  return z.enum(INVITE_ROLE_VALUES);
}
