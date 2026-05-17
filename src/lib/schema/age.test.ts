import { describe, it, expect } from "vitest";
import { STALE_DAYS, VERY_STALE_DAYS, schemaAgeRelative, schemaAgeStatus } from "./age";

const NOW = new Date("2026-05-18T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60_000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 60_000);

describe("schema/age", () => {
  describe("schemaAgeStatus", () => {
    it("null builtAt → never", () => {
      expect(schemaAgeStatus(null, NOW)).toBe("never");
    });

    it("undefined builtAt → never", () => {
      expect(schemaAgeStatus(undefined, NOW)).toBe("never");
    });

    it("invalid date string → never", () => {
      expect(schemaAgeStatus("not-a-date", NOW)).toBe("never");
    });

    it("now → fresh", () => {
      expect(schemaAgeStatus(NOW, NOW)).toBe("fresh");
    });

    it("1 day ago → fresh", () => {
      expect(schemaAgeStatus(daysAgo(1), NOW)).toBe("fresh");
    });

    it("exactly 7 days ago → fresh (boundary inclusive)", () => {
      expect(schemaAgeStatus(daysAgo(STALE_DAYS), NOW)).toBe("fresh");
    });

    it("7.5 days ago → stale", () => {
      expect(schemaAgeStatus(daysAgo(7.5), NOW)).toBe("stale");
    });

    it("exactly 30 days ago → stale (boundary inclusive)", () => {
      expect(schemaAgeStatus(daysAgo(VERY_STALE_DAYS), NOW)).toBe("stale");
    });

    it("31 days ago → very-stale", () => {
      expect(schemaAgeStatus(daysAgo(31), NOW)).toBe("very-stale");
    });

    it("365 days ago → very-stale", () => {
      expect(schemaAgeStatus(daysAgo(365), NOW)).toBe("very-stale");
    });

    it("future date (clock skew) → fresh (defensive)", () => {
      const future = new Date(NOW.getTime() + 60_000);
      expect(schemaAgeStatus(future, NOW)).toBe("fresh");
    });

    it("ISO string → parsed", () => {
      expect(schemaAgeStatus(NOW.toISOString(), NOW)).toBe("fresh");
    });
  });

  describe("schemaAgeRelative", () => {
    it("null → null", () => {
      expect(schemaAgeRelative(null, NOW)).toBeNull();
    });

    it("invalid string → null", () => {
      expect(schemaAgeRelative("nope", NOW)).toBeNull();
    });

    it("1 hour ago → hour 1", () => {
      expect(schemaAgeRelative(hoursAgo(1), NOW)).toEqual({ value: 1, unit: "hour" });
    });

    it("23 hours ago → hour 23", () => {
      expect(schemaAgeRelative(hoursAgo(23), NOW)).toEqual({ value: 23, unit: "hour" });
    });

    it("24 hours → day 1 (rolls over)", () => {
      expect(schemaAgeRelative(hoursAgo(24), NOW)).toEqual({ value: 1, unit: "day" });
    });

    it("3 days ago → day 3", () => {
      expect(schemaAgeRelative(daysAgo(3), NOW)).toEqual({ value: 3, unit: "day" });
    });

    it("floor truncation — 25h → day 1 not day 2", () => {
      expect(schemaAgeRelative(hoursAgo(25), NOW)).toEqual({ value: 1, unit: "day" });
    });

    it("just now → hour 0", () => {
      expect(schemaAgeRelative(NOW, NOW)).toEqual({ value: 0, unit: "hour" });
    });

    it("future date → hour 0 (defensive clamp)", () => {
      const future = new Date(NOW.getTime() + 60_000);
      expect(schemaAgeRelative(future, NOW)).toEqual({ value: 0, unit: "hour" });
    });
  });

  describe("constants", () => {
    it("STALE_DAYS positive int", () => {
      expect(Number.isInteger(STALE_DAYS)).toBe(true);
      expect(STALE_DAYS).toBeGreaterThan(0);
    });

    it("VERY_STALE_DAYS > STALE_DAYS", () => {
      expect(VERY_STALE_DAYS).toBeGreaterThan(STALE_DAYS);
    });
  });
});
