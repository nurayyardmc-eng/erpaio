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
