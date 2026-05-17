import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// env.ts caches on first call, so each test must re-import after stubbing.
async function freshEnv() {
  vi.resetModules();
  return await import("./env");
}

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Start from a known-good state (setup.ts sets defaults).
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("parses a valid environment", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    const env = getEnv();
    expect(env.ENCRYPTION_KEY).toMatch(/^[0-9a-f]{64}$/);
    expect(env.NEXTAUTH_SECRET.length).toBeGreaterThanOrEqual(16);
  });

  it("rejects short ENCRYPTION_KEY", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "tooshort";
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects ENCRYPTION_KEY with non-hex chars", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "z".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects short NEXTAUTH_SECRET", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "short";
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).toThrow(/NEXTAUTH_SECRET/);
  });

  it("rejects missing DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("rejects ANTHROPIC_API_KEY without sk- prefix", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "bogus-key";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("optional vars accept undefined", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.RESEND_API_KEY;
    const { getEnv } = await freshEnv();
    expect(() => getEnv()).not.toThrow();
  });

  it("caches first valid parse", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.DIRECT_URL = "postgresql://user:pass@host/db";
    process.env.NEXTAUTH_SECRET = "x".repeat(20);
    process.env.ENCRYPTION_KEY = "0".repeat(64);
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    process.env.CRON_SECRET = "x".repeat(20);
    const { getEnv } = await freshEnv();
    const a = getEnv();
    const b = getEnv();
    expect(a).toBe(b); // same reference (cached)
  });
});
