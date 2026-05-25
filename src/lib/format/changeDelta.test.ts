import { describe, it, expect } from "vitest";
import { changeDelta } from "./changeDelta";
import { colors } from "@/lib/theme";

describe("format/changeDelta", () => {
  describe("positive change → green ↑", () => {
    it("5.2 → ↑ 5.2 (success color)", () => {
      const r = changeDelta(5.2);
      expect(r.arrow).toBe("↑");
      expect(r.color).toBe(colors.success);
      expect(r.absText).toBe("5.2");
      expect(r.isMissing).toBe(false);
    });

    it("any positive number → ↑", () => {
      expect(changeDelta(0.1).arrow).toBe("↑");
      expect(changeDelta(100).arrow).toBe("↑");
      expect(changeDelta(0.001).arrow).toBe("↑");
    });
  });

  describe("negative change → red ↓", () => {
    it("-3.5 → ↓ 3.5 (error color)", () => {
      const r = changeDelta(-3.5);
      expect(r.arrow).toBe("↓");
      expect(r.color).toBe(colors.error);
      expect(r.absText).toBe("3.5");
      expect(r.isMissing).toBe(false);
    });

    it("any negative number → ↓", () => {
      expect(changeDelta(-0.1).arrow).toBe("↓");
      expect(changeDelta(-100).arrow).toBe("↓");
    });
  });

  describe("zero change → neutral →", () => {
    it("0 → → (no arrow), muted text color", () => {
      const r = changeDelta(0);
      expect(r.arrow).toBe("→");
      expect(r.color).toBe(colors.textMuted);
      expect(r.absText).toBe("0.0");
      expect(r.isMissing).toBe(false);
    });
  });

  describe("null/undefined → missing placeholder", () => {
    it("null → em-dash + textSubtle + isMissing", () => {
      const r = changeDelta(null);
      expect(r.arrow).toBe("→");
      expect(r.color).toBe(colors.textSubtle);
      expect(r.absText).toBe("—");
      expect(r.isMissing).toBe(true);
    });

    it("undefined → em-dash + isMissing", () => {
      const r = changeDelta(undefined);
      expect(r.absText).toBe("—");
      expect(r.isMissing).toBe(true);
    });
  });

  describe("absText format", () => {
    it("1 decimal place (toFixed)", () => {
      expect(changeDelta(5).absText).toBe("5.0");
      expect(changeDelta(5.55).absText).toBe("5.5"); // rounds down
      expect(changeDelta(5.56).absText).toBe("5.6"); // rounds up
    });

    it("absolute value of negative (no minus sign in absText)", () => {
      expect(changeDelta(-12.3).absText).toBe("12.3");
    });
  });

  describe("edge magnitudes", () => {
    it("very large positive → ↑ + big absText", () => {
      const r = changeDelta(99999.999);
      expect(r.arrow).toBe("↑");
      expect(r.absText).toBe("100000.0");
    });

    it("very small positive (still > 0) → ↑", () => {
      expect(changeDelta(0.0000001).arrow).toBe("↑");
    });

    it("Infinity → ↑", () => {
      expect(changeDelta(Infinity).arrow).toBe("↑");
    });

    it("-Infinity → ↓", () => {
      expect(changeDelta(-Infinity).arrow).toBe("↓");
    });

    it("NaN → → (default neutral; NOT > 0 and NOT < 0)", () => {
      const r = changeDelta(NaN);
      expect(r.arrow).toBe("→");
      // toFixed(NaN) = "NaN"
      expect(r.absText).toBe("NaN");
    });
  });

  describe("color matches theme tokens (regression marker)", () => {
    it("positive uses theme success token", () => {
      expect(changeDelta(1).color).toBe(colors.success);
    });

    it("negative uses theme error token", () => {
      expect(changeDelta(-1).color).toBe(colors.error);
    });
  });
});
