import { describe, it, expect } from "vitest";
import {
  rateLimit,
  RATE_LIMITS,
  retryAfterSeconds,
  rateLimited429,
  enforceIpRateLimit,
  enforceUserRateLimit,
} from "./rateLimit";

function reqWithLang(lang: "tr" | "en" = "tr"): Request {
  return new Request("https://example.test/api/x", {
    headers: { "accept-language": lang },
  });
}

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

describe("retryAfterSeconds", () => {
  it("returns ceil((reset - now) / 1000)", () => {
    const now = 1_700_000_000_000;
    expect(retryAfterSeconds(now + 1500, now)).toBe(2);
    expect(retryAfterSeconds(now + 1000, now)).toBe(1);
    expect(retryAfterSeconds(now + 500, now)).toBe(1);
  });

  it("zero when reset == now", () => {
    const now = 1_700_000_000_000;
    expect(retryAfterSeconds(now, now)).toBe(0);
  });

  it("clamps to 0 when reset is in the past (clock skew)", () => {
    const now = 1_700_000_000_000;
    expect(retryAfterSeconds(now - 10_000, now)).toBe(0);
  });

  it("default now uses Date.now()", () => {
    const reset = Date.now() + 5_000;
    const s = retryAfterSeconds(reset);
    expect(s).toBeGreaterThanOrEqual(4);
    expect(s).toBeLessThanOrEqual(6);
  });
});

describe("rateLimited429", () => {
  const future = Date.now() + 5_000;

  it("returns 429 with Retry-After header", async () => {
    const res = rateLimited429(reqWithLang("tr"), { reset: future, remaining: 0 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("body has locale-aware rateLimited message", async () => {
    const res = rateLimited429(reqWithLang("tr"), { reset: future, remaining: 0 });
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("includeRateLimitInfo: true adds X-RateLimit-* headers", () => {
    const res = rateLimited429(
      reqWithLang("tr"),
      { reset: future, remaining: 7 },
      { includeRateLimitInfo: true },
    );
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("7");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(future));
  });

  it("default omits X-RateLimit-* headers", () => {
    const res = rateLimited429(reqWithLang("tr"), { reset: future, remaining: 0 });
    expect(res.headers.get("X-RateLimit-Remaining")).toBeNull();
    expect(res.headers.get("X-RateLimit-Reset")).toBeNull();
  });
});

describe("enforceIpRateLimit", () => {
  function mkReq(ip?: string): Request {
    const h = new Headers();
    if (ip) h.set("x-forwarded-for", ip);
    h.set("accept-language", "tr");
    return new Request("https://example.test/api/x", { headers: h });
  }

  it("returns null when under limit", async () => {
    const cfg = { prefix: uniqueId("p"), max: 5, windowMs: 60_000 };
    const res = await enforceIpRateLimit(mkReq("203.0.113.1"), cfg);
    expect(res).toBeNull();
  });

  it("returns 429 Response when limit exceeded", async () => {
    const cfg = { prefix: uniqueId("p"), max: 1, windowMs: 60_000 };
    const ip = "203.0.113.99";
    await enforceIpRateLimit(mkReq(ip), cfg); // 1st: ok
    const res = await enforceIpRateLimit(mkReq(ip), cfg); // 2nd: blocked
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
  });

  it("scopes by client IP (different IPs independent)", async () => {
    const cfg = { prefix: uniqueId("p"), max: 1, windowMs: 60_000 };
    await enforceIpRateLimit(mkReq("10.0.0.1"), cfg);
    const blocked = await enforceIpRateLimit(mkReq("10.0.0.1"), cfg);
    const ok = await enforceIpRateLimit(mkReq("10.0.0.2"), cfg);
    expect(blocked).not.toBeNull();
    expect(ok).toBeNull();
  });
});

describe("enforceUserRateLimit", () => {
  it("returns null when under limit", async () => {
    const cfg = { prefix: uniqueId("u"), max: 5, windowMs: 60_000 };
    const res = await enforceUserRateLimit(reqWithLang(), "user_a", cfg);
    expect(res).toBeNull();
  });

  it("returns 429 when exceeded", async () => {
    const cfg = { prefix: uniqueId("u"), max: 1, windowMs: 60_000 };
    await enforceUserRateLimit(reqWithLang(), "user_b", cfg);
    const res = await enforceUserRateLimit(reqWithLang(), "user_b", cfg);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
  });

  it("scopes by userId", async () => {
    const cfg = { prefix: uniqueId("u"), max: 1, windowMs: 60_000 };
    await enforceUserRateLimit(reqWithLang(), "user_x", cfg);
    const blocked = await enforceUserRateLimit(reqWithLang(), "user_x", cfg);
    const ok = await enforceUserRateLimit(reqWithLang(), "user_y", cfg);
    expect(blocked).not.toBeNull();
    expect(ok).toBeNull();
  });
});
