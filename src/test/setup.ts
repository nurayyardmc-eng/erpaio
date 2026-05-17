// Vitest setup — runs once before all test files.
//
// Provides deterministic env vars so modules that load secrets at import time
// (e.g. src/lib/crypto/encrypt.ts) can be tested without a real .env.
// Production environment is always overridden.

// 32 bytes hex (64 chars) — deterministic test fixture, NOT a real secret.
process.env.ENCRYPTION_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

process.env.NEXTAUTH_SECRET ??= "test-secret-not-real";

// Disable external service env so notification modules degrade gracefully
// during tests instead of attempting real HTTP calls.
process.env.RESEND_API_KEY ??= "";
process.env.TWILIO_ACCOUNT_SID ??= "";
process.env.TWILIO_AUTH_TOKEN ??= "";
process.env.ANTHROPIC_API_KEY ??= "";
process.env.UPSTASH_REDIS_REST_URL ??= "";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "";
