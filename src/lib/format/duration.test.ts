import { describe, it, expect } from "vitest";
import { formatDurationMs } from "./duration";

describe("format/duration/formatDurationMs", () => {
  describe("sub-second (ms tier)", () => {
    it("0 → '0ms'", () => {
      expect(formatDurationMs(0)).toBe("0ms");
    });

    it("integer ms preserved", () => {
      expect(formatDurationMs(500)).toBe("500ms");
      expect(formatDurationMs(999)).toBe("999ms");
    });

    it("fractional ms rounded", () => {
      expect(formatDurationMs(123.4)).toBe("123ms");
      expect(formatDurationMs(123.6)).toBe("124ms");
    });

    it("negative clamped to 0ms (defensive)", () => {
      expect(formatDurationMs(-50)).toBe("0ms");
    });
  });

  describe("second tier (≥ 1000ms)", () => {
    it("exactly 1000 → '1s' (trailing .0 dropped)", () => {
      expect(formatDurationMs(1000)).toBe("1s");
    });

    it("fractional → 1 decimal", () => {
      expect(formatDurationMs(1500)).toBe("1.5s");
      expect(formatDurationMs(2750)).toBe("2.8s"); // toFixed rounds
    });

    it("large value still 1 decimal (no M/B tier)", () => {
      expect(formatDurationMs(125_000)).toBe("125s");
    });

    it("multi-digit second value drops trailing .0", () => {
      expect(formatDurationMs(5_000)).toBe("5s");
      expect(formatDurationMs(60_000)).toBe("60s");
    });
  });

  describe("boundary 1000ms", () => {
    it("999ms → 'ms' tier", () => {
      expect(formatDurationMs(999)).toBe("999ms");
    });

    it("1000ms → 's' tier (inclusive)", () => {
      expect(formatDurationMs(1000)).toBe("1s");
    });

    it("1001ms → '1s' (rounds via toFixed to 1.0)", () => {
      expect(formatDurationMs(1001)).toBe("1s");
    });
  });

  describe("null/undefined → em-dash", () => {
    it("null → '—'", () => {
      expect(formatDurationMs(null)).toBe("—");
    });

    it("undefined → '—'", () => {
      expect(formatDurationMs(undefined)).toBe("—");
    });
  });

  describe("realistic slow-query / cron values", () => {
    it("typical slow query 3.4s", () => {
      expect(formatDurationMs(3421)).toBe("3.4s");
    });

    it("very slow ERP query 12.5s", () => {
      expect(formatDurationMs(12_543)).toBe("12.5s");
    });

    it("cron job 45s", () => {
      expect(formatDurationMs(45_000)).toBe("45s");
    });

    it("fast query 12ms", () => {
      expect(formatDurationMs(12)).toBe("12ms");
    });
  });
});
