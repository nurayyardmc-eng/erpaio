// Pure helpers for API token generation & hashing.
//
// Kept separate from dual.ts so they can be unit-tested without pulling in
// NextAuth (which fails to import under vitest's Node environment).
//
// Token format: 32 random bytes encoded as base64url (43 chars, no padding).
// Lookup key: SHA-256 hash of the raw token, stored in ApiToken.tokenHash.

import { sha256Hex } from "@/lib/crypto/hash";
import { generateSecureToken } from "@/lib/crypto/token";

/** Generate a fresh API token. Plaintext shown ONCE to the user. */
export function generateApiToken(): string {
  return generateSecureToken();
}

/** SHA-256 hash of an API token — the value stored in DB and used for lookup. */
export function hashApiToken(raw: string): string {
  return sha256Hex(raw);
}
