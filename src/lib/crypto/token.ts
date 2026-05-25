/**
 * Secure random token generator — single source of truth.
 *
 * Track NNNNNN — same `randomBytes(32).toString("base64url")` inline
 * pattern appeared in 5 sites (auth flows + apiToken).
 *
 * Output: base64url-encoded (no padding, URL-safe chars only). 32 random
 * bytes ≈ 256 bits of entropy, encodes to a 43-char string.
 *
 * Used for:
 *  - Email verification tokens (sent in URL)
 *  - Password reset tokens (sent in URL)
 *  - Team invitation tokens (sent in URL)
 *  - Email-change confirmation tokens (sent in URL)
 *  - API tokens (Bearer auth)
 *
 * All callers store SHA-256 hash in DB (see sha256Hex) — raw token shown
 * once to the recipient, never persisted plaintext.
 */
import { randomBytes } from "node:crypto";

export const DEFAULT_TOKEN_BYTES = 32;

export function generateSecureToken(bytes: number = DEFAULT_TOKEN_BYTES): string {
  return randomBytes(bytes).toString("base64url");
}
