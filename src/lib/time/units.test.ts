import { describe, it, expect } from "vitest";
import {
  ONE_MINUTE_MS,
  ONE_HOUR_MS,
  ONE_DAY_MS,
  daysFromNow,
  daysAgo,
  toDate,
} from "./units";

describe("time/units constants", () => {
  it("ONE_MINUTE_MS = 60_000", () => {
    expect(ONE_MINUTE_MS).toBe(60_000);
    expect(ONE_MINUTE_MS).toBe(60 * 1000);
  });

  it("ONE_HOUR_MS = 60 * ONE_MINUTE_MS", () => {
    expect(ONE_HOUR_MS).toBe(60 * 60_000);
    expect(ONE_HOUR_MS).toBe(3_600_000);
  });

  it("ONE_DAY_MS = 24 * ONE_HOUR_MS", () => {
    expect(ONE_DAY_MS).toBe(24 * 60 * 60 * 1000);
    expect(ONE_DAY_MS).toBe(86_400_000);
  });

  it("constants are positive integers", () => {
    for (const v of [ONE_MINUTE_MS, ONE_HOUR_MS, ONE_DAY_MS]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("relative ordering: minute < hour < day", () => {
    expect(ONE_MINUTE_MS).toBeLessThan(ONE_HOUR_MS);
    expect(ONE_HOUR_MS).toBeLessThan(ONE_DAY_MS);
  });
});

describe("time/units daysFromNow", () => {
  const NOW = new Date("2026-05-26T12:00:00Z").getTime();

  it("+1 day = exactly 86_400_000 ms after now", () => {
    const d = daysFromNow(1, NOW);
    expect(d.getTime() - NOW).toBe(ONE_DAY_MS);
  });

  it("+0 days = now", () => {
    expect(daysFromNow(0, NOW).getTime()).toBe(NOW);
  });

  it("+90 days for refresh-token expiry", () => {
    const d = daysFromNow(90, NOW);
    expect(d.getTime() - NOW).toBe(90 * ONE_DAY_MS);
  });

  it("negative N goes backwards (equivalent to daysAgo)", () => {
    expect(daysFromNow(-7, NOW).getTime()).toBe(daysAgo(7, NOW).getTime());
  });

  it("default now=Date.now() — returned Date is in the future for positive N", () => {
    const before = Date.now();
    const d = daysFromNow(1);
    expect(d.getTime()).toBeGreaterThanOrEqual(before + ONE_DAY_MS);
  });
});

describe("time/units daysAgo", () => {
  const NOW = new Date("2026-05-26T12:00:00Z").getTime();

  it("-1 day = exactly 86_400_000 ms before now", () => {
    expect(NOW - daysAgo(1, NOW).getTime()).toBe(ONE_DAY_MS);
  });

  it("-30 days for analytics baseline", () => {
    expect(NOW - daysAgo(30, NOW).getTime()).toBe(30 * ONE_DAY_MS);
  });

  it("0 days = now", () => {
    expect(daysAgo(0, NOW).getTime()).toBe(NOW);
  });
});

describe("time/units toDate", () => {
  it("passes a Date through unchanged (same reference)", () => {
    const d = new Date("2026-05-26T12:00:00Z");
    expect(toDate(d)).toBe(d);
  });

  it("parses an ISO string to the same instant", () => {
    const iso = "2026-05-26T12:00:00Z";
    expect(toDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it("accepts an epoch-ms number", () => {
    expect(toDate(1_700_000_000_000).getTime()).toBe(1_700_000_000_000);
  });

  it("invalid string yields an Invalid Date the caller can NaN-guard", () => {
    expect(Number.isNaN(toDate("not-a-date").getTime())).toBe(true);
  });
});
