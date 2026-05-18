import { describe, it, expect } from "vitest";
import { budgetStatusLevel, daysUntilReset, formatTokens } from "./format";

describe("budget/format", () => {
  describe("formatTokens", () => {
    it("0 → '0'", () => {
      expect(formatTokens(0)).toBe("0");
    });

    it("under 1000 → raw integer", () => {
      expect(formatTokens(234)).toBe("234");
      expect(formatTokens(999)).toBe("999");
    });

    it("round small numbers", () => {
      expect(formatTokens(234.6)).toBe("235");
    });

    it("1000 → '1K' (trailing .0 stripped)", () => {
      expect(formatTokens(1000)).toBe("1K");
    });

    it("12300 → '12.3K'", () => {
      expect(formatTokens(12300)).toBe("12.3K");
    });

    it("999_999 → '1000K' boundary (still K formatting at .999M)", () => {
      // 999999 / 1000 = 999.999 → "1000K". Acceptable; M kicks in at exactly 1M.
      expect(formatTokens(999_999)).toBe("1000K");
    });

    it("1_000_000 → '1M'", () => {
      expect(formatTokens(1_000_000)).toBe("1M");
    });

    it("1_200_000 → '1.2M'", () => {
      expect(formatTokens(1_200_000)).toBe("1.2M");
    });

    it("20_000_000 → '20M'", () => {
      expect(formatTokens(20_000_000)).toBe("20M");
    });

    it("NaN/Infinity → '0' (defensive)", () => {
      expect(formatTokens(NaN)).toBe("0");
      expect(formatTokens(Infinity)).toBe("0");
    });

    it("negative numbers — uses abs for bucket but renders sign", () => {
      // -500 < 1000 → raw negative integer
      expect(formatTokens(-500)).toBe("-500");
      // -12300 negatif K range
      expect(formatTokens(-12300)).toBe("-12.3K");
    });
  });

  describe("budgetStatusLevel", () => {
    it("0% → ok", () => {
      expect(budgetStatusLevel(0)).toBe("ok");
    });

    it("60% → ok (sınır dahil)", () => {
      expect(budgetStatusLevel(60)).toBe("ok");
    });

    it("60.01% → warning", () => {
      expect(budgetStatusLevel(60.01)).toBe("warning");
    });

    it("85% → warning (sınır dahil)", () => {
      expect(budgetStatusLevel(85)).toBe("warning");
    });

    it("85.01% → danger", () => {
      expect(budgetStatusLevel(85.01)).toBe("danger");
    });

    it("100% → danger", () => {
      expect(budgetStatusLevel(100)).toBe("danger");
    });

    it("over 100% (over budget) → danger", () => {
      expect(budgetStatusLevel(150)).toBe("danger");
    });

    it("NaN → ok (defensive)", () => {
      expect(budgetStatusLevel(NaN)).toBe("ok");
    });
  });

  describe("daysUntilReset", () => {
    const NOW = new Date("2026-05-18T12:00:00Z");

    it("future date → positive days", () => {
      const target = new Date(NOW.getTime() + 5 * 24 * 60 * 60_000);
      expect(daysUntilReset(target, NOW)).toBe(5);
    });

    it("ISO string accepted", () => {
      const target = new Date(NOW.getTime() + 10 * 24 * 60 * 60_000);
      expect(daysUntilReset(target.toISOString(), NOW)).toBe(10);
    });

    it("past date → 0 (defensive clamp)", () => {
      const past = new Date(NOW.getTime() - 24 * 60 * 60_000);
      expect(daysUntilReset(past, NOW)).toBe(0);
    });

    it("exactly now → 0", () => {
      expect(daysUntilReset(NOW, NOW)).toBe(0);
    });

    it("invalid date string → 0", () => {
      expect(daysUntilReset("not-a-date", NOW)).toBe(0);
    });

    it("floor truncation — 5.9 days → 5", () => {
      const target = new Date(NOW.getTime() + 5.9 * 24 * 60 * 60_000);
      expect(daysUntilReset(target, NOW)).toBe(5);
    });
  });
});
