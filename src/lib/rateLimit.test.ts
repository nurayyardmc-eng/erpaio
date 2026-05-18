import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMITS } from "./rateLimit";

/**
 * Test setup (src/test/setup.ts) Upstash env'lerini boş bırakır →
 * rateLimit in-memory fallback'a düşer (deterministic, deterministic).
 *
 * Module-scoped Map state'i test'ler arası paylaşıldığı için identifier
 * uniqueness şart: prefix + randomUUID-ish suffix kullan.
 */
function uniqueId(label: string): string {
  return `${label}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

describe("rateLimit (in-memory fallback)", () => {
  it("first call returns success=true, remaining = max-1", async () => {
    const id = uniqueId("a");
    const r = await rateLimit(id, { prefix: "test", max: 5, windowMs: 60_000 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.reset).toBeGreaterThan(Date.now());
  });

  it("up to max calls succeed, then fails (sliding window)", async () => {
    const id = uniqueId("b");
    const cfg = { prefix: "test", max: 3, windowMs: 60_000 };
    const r1 = await rateLimit(id, cfg);
    const r2 = await rateLimit(id, cfg);
    const r3 = await rateLimit(id, cfg);
    const r4 = await rateLimit(id, cfg);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("remaining decrements monotonically", async () => {
    const id = uniqueId("c");
    const cfg = { prefix: "test", max: 5, windowMs: 60_000 };
    const r1 = await rateLimit(id, cfg);
    const r2 = await rateLimit(id, cfg);
    const r3 = await rateLimit(id, cfg);
    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
    expect(r3.remaining).toBe(2);
  });

  it("different identifiers tracked independently", async () => {
    const a = uniqueId("d-a");
    const b = uniqueId("d-b");
    const cfg = { prefix: "test", max: 2, windowMs: 60_000 };
    await rateLimit(a, cfg);
    await rateLimit(a, cfg);
    const aFail = await rateLimit(a, cfg);
    const bOk = await rateLimit(b, cfg);
    expect(aFail.success).toBe(false);
    expect(bOk.success).toBe(true);
  });

  it("different prefixes for same identifier tracked independently", async () => {
    const id = uniqueId("e");
    const r1 = await rateLimit(id, { prefix: "p1", max: 1, windowMs: 60_000 });
    const r2 = await rateLimit(id, { prefix: "p1", max: 1, windowMs: 60_000 });
    const r3 = await rateLimit(id, { prefix: "p2", max: 1, windowMs: 60_000 });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r3.success).toBe(true); // farklı prefix → ayrı bucket
  });

  it("reset timestamp returned consistently for blocked calls", async () => {
    const id = uniqueId("f");
    const cfg = { prefix: "test", max: 1, windowMs: 60_000 };
    await rateLimit(id, cfg);
    const blocked = await rateLimit(id, cfg);
    expect(blocked.success).toBe(false);
    expect(blocked.reset).toBeGreaterThan(Date.now());
    expect(blocked.reset).toBeLessThanOrEqual(Date.now() + 60_000);
  });
});

describe("RATE_LIMITS constants", () => {
  it("CHAT bucket sensible: 30/min", () => {
    expect(RATE_LIMITS.CHAT.max).toBe(30);
    expect(RATE_LIMITS.CHAT.windowMs).toBe(60_000);
  });

  it("RESET_PASSWORD strict: 5/saat (60min)", () => {
    expect(RATE_LIMITS.RESET_PASSWORD.max).toBe(5);
    expect(RATE_LIMITS.RESET_PASSWORD.windowMs).toBe(60 * 60_000);
  });

  it("CONNECTION_SCHEMA_SYNC heavy op: 10/saat", () => {
    expect(RATE_LIMITS.CONNECTION_SCHEMA_SYNC.max).toBe(10);
    expect(RATE_LIMITS.CONNECTION_SCHEMA_SYNC.windowMs).toBe(60 * 60_000);
  });

  it("all bucket prefixes are unique strings (no collision)", () => {
    const prefixes = Object.values(RATE_LIMITS).map((b) => b.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("all max values positive integers", () => {
    for (const b of Object.values(RATE_LIMITS)) {
      expect(Number.isInteger(b.max)).toBe(true);
      expect(b.max).toBeGreaterThan(0);
    }
  });
});
