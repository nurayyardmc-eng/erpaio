import { describe, it, expect, afterEach } from "vitest";
import {
  exceedsDailyCap,
  dailyKey,
  dailyTokenCap,
  DEFAULT_DAILY_TOKEN_CAP,
} from "./dailyLimit";

describe("lib/budget/dailyLimit/exceedsDailyCap", () => {
  it("false when under cap", () => {
    expect(exceedsDailyCap(100, 200, 1000)).toBe(false);
  });
  it("false exactly at cap", () => {
    expect(exceedsDailyCap(800, 200, 1000)).toBe(false);
  });
  it("true when crossing cap", () => {
    expect(exceedsDailyCap(900, 200, 1000)).toBe(true);
  });
  it("true when already over", () => {
    expect(exceedsDailyCap(1200, 1, 1000)).toBe(true);
  });
});

describe("lib/budget/dailyLimit/dailyKey", () => {
  it("encodes tenant + UTC date", () => {
    const d = new Date("2026-05-31T23:59:00.000Z");
    expect(dailyKey("tenant1", d)).toBe("daily-tok:tenant1:2026-05-31");
  });
  it("rolls to the next UTC day", () => {
    const d = new Date("2026-06-01T00:01:00.000Z");
    expect(dailyKey("t", d)).toBe("daily-tok:t:2026-06-01");
  });
  it("different tenants get distinct keys", () => {
    const d = new Date("2026-05-31T10:00:00.000Z");
    expect(dailyKey("a", d)).not.toBe(dailyKey("b", d));
  });
});

describe("lib/budget/dailyLimit/dailyTokenCap", () => {
  const original = process.env.DAILY_TOKEN_CAP;
  afterEach(() => {
    if (original === undefined) delete process.env.DAILY_TOKEN_CAP;
    else process.env.DAILY_TOKEN_CAP = original;
  });

  it("defaults when env unset", () => {
    delete process.env.DAILY_TOKEN_CAP;
    expect(dailyTokenCap()).toBe(DEFAULT_DAILY_TOKEN_CAP);
  });
  it("reads a positive env override", () => {
    process.env.DAILY_TOKEN_CAP = "250000";
    expect(dailyTokenCap()).toBe(250_000);
  });
  it("ignores non-numeric / zero / negative env", () => {
    process.env.DAILY_TOKEN_CAP = "abc";
    expect(dailyTokenCap()).toBe(DEFAULT_DAILY_TOKEN_CAP);
    process.env.DAILY_TOKEN_CAP = "0";
    expect(dailyTokenCap()).toBe(DEFAULT_DAILY_TOKEN_CAP);
    process.env.DAILY_TOKEN_CAP = "-5";
    expect(dailyTokenCap()).toBe(DEFAULT_DAILY_TOKEN_CAP);
  });
});
