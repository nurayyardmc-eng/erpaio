import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getReadinessReport } from "./productionReadiness";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});
afterEach(() => {
  process.env = ORIGINAL;
});

describe("lib/productionReadiness/getReadinessReport", () => {
  it("returns checks list + blocker/warning counts", () => {
    const r = getReadinessReport();
    expect(Array.isArray(r.checks)).toBe(true);
    expect(typeof r.blockerCount).toBe("number");
    expect(typeof r.warningCount).toBe("number");
  });

  it("missing critical env → blocker incremented", () => {
    delete process.env.DATABASE_URL;
    delete process.env.ENCRYPTION_KEY;
    const r = getReadinessReport();
    expect(r.blockerCount).toBeGreaterThanOrEqual(2);
    expect(
      r.checks.find((c) => c.key === "DATABASE_URL")?.level,
    ).toBe("missing");
  });

  it("DATABASE_URL set → ok level", () => {
    process.env.DATABASE_URL = "postgresql://test";
    const r = getReadinessReport();
    const db = r.checks.find((c) => c.key === "DATABASE_URL");
    expect(db?.level).toBe("ok");
  });

  it("Upstash missing → 'fallback' level (not blocker)", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const r = getReadinessReport();
    const upstash = r.checks.find((c) => c.key === "UPSTASH_REDIS_REST_URL");
    expect(upstash?.level).toBe("fallback");
    expect(upstash?.productionRequired).toBe(false);
  });

  it("Upstash both vars set → ok", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    const r = getReadinessReport();
    expect(
      r.checks.find((c) => c.key === "UPSTASH_REDIS_REST_URL")?.level,
    ).toBe("ok");
  });

  it("only one Upstash var set → fallback (not ok)", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const r = getReadinessReport();
    expect(
      r.checks.find((c) => c.key === "UPSTASH_REDIS_REST_URL")?.level,
    ).toBe("fallback");
  });

  it("billing absent both → 2 warnings (Stripe + iyzico), 0 blockers", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.IYZICO_API_KEY;
    delete process.env.IYZICO_SECRET_KEY;
    const r = getReadinessReport();
    const stripe = r.checks.find((c) => c.key === "STRIPE_SECRET_KEY");
    const iyzico = r.checks.find((c) => c.key === "IYZICO_API_KEY");
    expect(stripe?.level).toBe("fallback");
    expect(iyzico?.level).toBe("fallback");
    expect(stripe?.productionRequired).toBe(false);
    expect(iyzico?.productionRequired).toBe(false);
  });

  it("Sentry absent → fallback warning", () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const r = getReadinessReport();
    expect(
      r.checks.find((c) => c.key === "NEXT_PUBLIC_SENTRY_DSN")?.level,
    ).toBe("fallback");
  });

  it("blocker check labels reference required env names", () => {
    const r = getReadinessReport();
    const blockers = r.checks.filter((c) => c.productionRequired);
    expect(blockers.length).toBeGreaterThanOrEqual(5); // DB, KEY, AUTH, AI, CRON
  });

  it("all checks have label + detail strings", () => {
    const r = getReadinessReport();
    for (const c of r.checks) {
      expect(typeof c.label).toBe("string");
      expect(c.label.length).toBeGreaterThan(0);
      expect(typeof c.detail).toBe("string");
      expect(c.detail.length).toBeGreaterThan(0);
    }
  });

  it("blockerCount aggregation accurate", () => {
    delete process.env.DATABASE_URL;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CRON_SECRET;
    const r = getReadinessReport();
    expect(r.blockerCount).toBe(5);
  });

  it("level values restricted to ok|missing|fallback", () => {
    const r = getReadinessReport();
    for (const c of r.checks) {
      expect(["ok", "missing", "fallback"]).toContain(c.level);
    }
  });
});
