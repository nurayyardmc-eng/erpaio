import { describe, it, expect } from "vitest";
import { confidenceBucket } from "./confidence";

describe("ai/confidence/confidenceBucket", () => {
  describe("boundary inclusivity (inclusive lower)", () => {
    it("0.95 → 'high' (inclusive)", () => {
      expect(confidenceBucket(0.95)).toBe("high");
    });
    it("0.70 → 'med' (inclusive)", () => {
      expect(confidenceBucket(0.7)).toBe("med");
    });
    it("0.40 → 'low' (inclusive)", () => {
      expect(confidenceBucket(0.4)).toBe("low");
    });
  });

  describe("boundary exclusivity (just-below)", () => {
    it("0.94 → 'med' (just below high)", () => {
      expect(confidenceBucket(0.94)).toBe("med");
    });
    it("0.69 → 'low' (just below med)", () => {
      expect(confidenceBucket(0.69)).toBe("low");
    });
    it("0.39 → 'very_low' (just below low)", () => {
      expect(confidenceBucket(0.39)).toBe("very_low");
    });
  });

  describe("each bucket has at least one representative value", () => {
    it("1.0 → 'high' (max)", () => {
      expect(confidenceBucket(1.0)).toBe("high");
    });
    it("0.85 → 'med'", () => {
      expect(confidenceBucket(0.85)).toBe("med");
    });
    it("0.5 → 'low'", () => {
      expect(confidenceBucket(0.5)).toBe("low");
    });
    it("0.0 → 'very_low' (min)", () => {
      expect(confidenceBucket(0.0)).toBe("very_low");
    });
  });

  describe("out-of-range inputs (defensive — clamping is parser's job)", () => {
    it("> 1 still high", () => {
      expect(confidenceBucket(1.5)).toBe("high");
    });
    it("< 0 still very_low", () => {
      expect(confidenceBucket(-0.5)).toBe("very_low");
    });
    it("NaN → very_low (all comparisons false)", () => {
      expect(confidenceBucket(NaN)).toBe("very_low");
    });
    it("Infinity → high (passes 0.95)", () => {
      expect(confidenceBucket(Infinity)).toBe("high");
    });
    it("-Infinity → very_low", () => {
      expect(confidenceBucket(-Infinity)).toBe("very_low");
    });
  });

  describe("bucket coverage (sweep)", () => {
    it("samples across [0, 1] map to exactly one bucket", () => {
      const buckets = new Set<string>();
      for (let i = 0; i <= 100; i++) {
        buckets.add(confidenceBucket(i / 100));
      }
      expect(buckets).toEqual(new Set(["high", "med", "low", "very_low"]));
    });
  });
});
