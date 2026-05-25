import { describe, it, expect } from "vitest";
import { computeReliability } from "./reliability";

describe("cache/reliability/computeReliability", () => {
  describe("happy path", () => {
    it("all successes → 1.0", () => {
      expect(computeReliability(10, 0)).toBe(1);
    });

    it("all failures → 0.0", () => {
      expect(computeReliability(0, 10)).toBe(0);
    });

    it("equal split → 0.5", () => {
      expect(computeReliability(5, 5)).toBe(0.5);
    });

    it("8 success, 2 fail → 0.8", () => {
      expect(computeReliability(8, 2)).toBe(0.8);
    });

    it("realistic 95% success rate", () => {
      expect(computeReliability(95, 5)).toBe(0.95);
    });
  });

  describe("no-attempts edge (optimistic default)", () => {
    it("0 success + 0 fail → 1.0 (newly cached, don't show 0%)", () => {
      expect(computeReliability(0, 0)).toBe(1);
    });
  });

  describe("defensive (negative counts treated as no-data)", () => {
    it("negative total → 1.0 fallback", () => {
      // Defensive: prisma should never return negative counts but check anyway.
      expect(computeReliability(-1, 0)).toBe(1);
    });
  });

  describe("output bounds", () => {
    it("always in [0, 1] for non-negative input", () => {
      const cases: [number, number][] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [100, 50],
        [50, 100],
        [1, 99],
      ];
      for (const [s, f] of cases) {
        const r = computeReliability(s, f);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("regression markers", () => {
    it("denominator is total (NOT successCount alone — would always return 1)", () => {
      // If implementation divides by successCount instead of total, this test
      // would return 1; it must return < 1.
      expect(computeReliability(10, 90)).toBeLessThan(0.5);
    });

    it("single fail with 9 successes → 0.9 (90%)", () => {
      expect(computeReliability(9, 1)).toBe(0.9);
    });
  });
});
