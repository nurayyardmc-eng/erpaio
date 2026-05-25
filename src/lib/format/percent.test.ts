import { describe, it, expect } from "vitest";
import { formatPercent, formatPercentInt } from "./percent";

describe("format/percent/formatPercentInt", () => {
  it("0 → '0'", () => {
    expect(formatPercentInt(0)).toBe("0");
  });

  it("0.5 → '50'", () => {
    expect(formatPercentInt(0.5)).toBe("50");
  });

  it("1.0 → '100'", () => {
    expect(formatPercentInt(1.0)).toBe("100");
  });

  it("0.123 → '12' (rounded down)", () => {
    expect(formatPercentInt(0.123)).toBe("12");
  });

  it("0.125 → '13' (rounds half-up)", () => {
    expect(formatPercentInt(0.125)).toBe("13");
  });

  it("0.999 → '100'", () => {
    expect(formatPercentInt(0.999)).toBe("100");
  });

  it("out-of-range > 1 NOT clamped → '150'", () => {
    expect(formatPercentInt(1.5)).toBe("150");
  });

  it("negative → negative integer", () => {
    expect(formatPercentInt(-0.25)).toBe("-25");
  });

  it("null → '—'", () => {
    expect(formatPercentInt(null)).toBe("—");
  });

  it("undefined → '—'", () => {
    expect(formatPercentInt(undefined)).toBe("—");
  });

  it("NaN → '—' (defensive)", () => {
    expect(formatPercentInt(NaN)).toBe("—");
  });
});

describe("format/percent/formatPercent", () => {
  it("appends '%' to integer", () => {
    expect(formatPercent(0.42)).toBe("42%");
  });

  it("null → '—' (no % appended)", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("0 → '0%'", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("100% case", () => {
    expect(formatPercent(1)).toBe("100%");
  });

  it("typical use cases (success rate)", () => {
    expect(formatPercent(0.95)).toBe("95%");
    expect(formatPercent(0.123)).toBe("12%");
  });
});
