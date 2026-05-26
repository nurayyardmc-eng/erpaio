import { describe, it, expect } from "vitest";
import { ONE_MINUTE_MS, ONE_HOUR_MS, ONE_DAY_MS } from "./units";

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
