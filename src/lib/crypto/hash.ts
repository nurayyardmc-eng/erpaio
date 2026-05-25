/**
 * SHA-256 hex digest — single source of truth.
 *
 * Track MMMMMM — same inline pattern appeared in 10 sites
 * (auth/signup, verify-email, forgot-password, verify-email-change,
 * reset-password, send-verification, team/invite, team/accept-invite,
 * me/email/request-change, crypto/keyRotation, lib/auth/apiToken).
 *
 * Used for:
 *  - Password reset token hashing (raw never stored)
 *  - Email verification token hashing
 *  - API token hashing (apiToken.ts re-export)
 *  - Encryption key fingerprint (keyRotation.ts)
 *
 * Always returns lowercase hex (Node's default for createHash digest).
 */
import { createHash } from "node:crypto";

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
