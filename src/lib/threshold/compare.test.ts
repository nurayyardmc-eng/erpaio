import { describe, it, expect } from "vitest";
import { compareThreshold, thresholdOpSymbol } from "./compare";

describe("threshold/compare/compareThreshold", () => {
  describe("lt (less than)", () => {
    it("value below threshold → true", () => {
      expect(compareThreshold("lt", 5, 10)).toBe(true);
    });
    it("value equal threshold → false (strict)", () => {
      expect(compareThreshold("lt", 10, 10)).toBe(false);
    });
    it("value above threshold → false", () => {
      expect(compareThreshold("lt", 15, 10)).toBe(false);
    });
  });

  describe("lte (less than or equal)", () => {
    it("value below threshold → true", () => {
      expect(compareThreshold("lte", 5, 10)).toBe(true);
    });
    it("value equal threshold → true (inclusive)", () => {
      expect(compareThreshold("lte", 10, 10)).toBe(true);
    });
    it("value above threshold → false", () => {
      expect(compareThreshold("lte", 15, 10)).toBe(false);
    });
  });

  describe("gt (greater than)", () => {
    it("value above threshold → true", () => {
      expect(compareThreshold("gt", 15, 10)).toBe(true);
    });
    it("value equal threshold → false (strict)", () => {
      expect(compareThreshold("gt", 10, 10)).toBe(false);
    });
    it("value below threshold → false", () => {
      expect(compareThreshold("gt", 5, 10)).toBe(false);
    });
  });

  describe("gte (greater than or equal)", () => {
    it("value above threshold → true", () => {
      expect(compareThreshold("gte", 15, 10)).toBe(true);
    });
    it("value equal threshold → true (inclusive)", () => {
      expect(compareThreshold("gte", 10, 10)).toBe(true);
    });
    it("value below threshold → false", () => {
      expect(compareThreshold("gte", 5, 10)).toBe(false);
    });
  });

  describe("eq (equal)", () => {
    it("identical → true", () => {
      expect(compareThreshold("eq", 10, 10)).toBe(true);
    });
    it("different → false", () => {
      expect(compareThreshold("eq", 10, 11)).toBe(false);
    });
    it("0 === 0 → true", () => {
      expect(compareThreshold("eq", 0, 0)).toBe(true);
    });
    it("strict equality (NaN !== NaN)", () => {
      expect(compareThreshold("eq", NaN, NaN)).toBe(false);
    });
  });

  describe("unknown op (defensive)", () => {
    it("returns false instead of throwing", () => {
      expect(compareThreshold("ne", 5, 10)).toBe(false);
      expect(compareThreshold("contains", 5, 10)).toBe(false);
      expect(compareThreshold("", 5, 10)).toBe(false);
    });
  });

  describe("edge values", () => {
    it("negative numbers", () => {
      expect(compareThreshold("lt", -10, 0)).toBe(true);
      expect(compareThreshold("gt", -5, -10)).toBe(true);
    });
    it("floating point", () => {
      expect(compareThreshold("gt", 0.1 + 0.2, 0.3)).toBe(true); // 0.30000…04
    });
    it("Infinity", () => {
      expect(compareThreshold("gt", Infinity, 1e9)).toBe(true);
      expect(compareThreshold("lt", -Infinity, -1e9)).toBe(true);
    });
  });
});

describe("threshold/compare/thresholdOpSymbol", () => {
  it("maps each op to its TR-localized symbol", () => {
    expect(thresholdOpSymbol("lt")).toBe("<");
    expect(thresholdOpSymbol("lte")).toBe("≤");
    expect(thresholdOpSymbol("gt")).toBe(">");
    expect(thresholdOpSymbol("gte")).toBe("≥");
    expect(thresholdOpSymbol("eq")).toBe("=");
  });
});
