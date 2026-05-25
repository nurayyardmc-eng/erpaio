import { describe, it, expect } from "vitest";
import { formatN, pieSlices, formatNullableN } from "./format";

describe("charts/format/formatN", () => {
  it("0 → '0'", () => {
    expect(formatN(0)).toBe("0");
  });

  it("small integers locale-formatted (tr-TR)", () => {
    expect(formatN(7)).toBe("7");
    expect(formatN(42)).toBe("42");
  });

  it("hundreds rendered with TR thousand separator absent (< 1000)", () => {
    expect(formatN(999)).toBe("999");
  });

  it("thousands abbreviated with 'k' suffix", () => {
    expect(formatN(1000)).toBe("1.0k");
    expect(formatN(1500)).toBe("1.5k");
    expect(formatN(12345)).toBe("12.3k");
  });

  it("millions abbreviated with 'M' suffix", () => {
    expect(formatN(1_000_000)).toBe("1.0M");
    expect(formatN(2_500_000)).toBe("2.5M");
    expect(formatN(15_400_000)).toBe("15.4M");
  });

  it("billions still rendered with 'M' (no 'B' tier)", () => {
    expect(formatN(1_500_000_000)).toBe("1500.0M");
  });

  it("negative numbers abbreviated by absolute magnitude", () => {
    expect(formatN(-2500)).toBe("-2.5k");
    expect(formatN(-1_200_000)).toBe("-1.2M");
  });

  it("fractional below 1000 uses TR locale (comma decimal)", () => {
    // tr-TR uses ',' as decimal separator
    expect(formatN(12.5)).toBe("12,5");
  });

  it("rounds to 1 fractional digit at small scale", () => {
    // Intl rounds half-up to 1 fractional digit → 0,55 → "0,6"
    expect(formatN(0.55)).toBe("0,6");
  });

  it("boundary at 1000 exactly", () => {
    expect(formatN(1000)).toBe("1.0k");
    expect(formatN(999.9)).toBe("999,9"); // below 1000
  });

  it("boundary at 1_000_000 exactly", () => {
    expect(formatN(1_000_000)).toBe("1.0M");
  });
});

describe("charts/format/pieSlices", () => {
  it("empty values → empty array", () => {
    expect(pieSlices([])).toEqual([]);
  });

  it("all-zero values → empty array (no degenerate slices)", () => {
    expect(pieSlices([{ label: "a", value: 0 }, { label: "b", value: 0 }])).toEqual([]);
  });

  it("single value → one slice spanning full 360°", () => {
    const r = pieSlices([{ label: "only", value: 50 }]);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(0);
    expect(r[0].end).toBe(360);
    expect(r[0].fraction).toBe(1);
  });

  it("two equal values → 180° each", () => {
    const r = pieSlices([
      { label: "a", value: 50 },
      { label: "b", value: 50 },
    ]);
    expect(r[0].start).toBe(0);
    expect(r[0].end).toBe(180);
    expect(r[1].start).toBe(180);
    expect(r[1].end).toBe(360);
    expect(r[0].fraction).toBe(0.5);
    expect(r[1].fraction).toBe(0.5);
  });

  it("cumulative: each slice starts where previous ended", () => {
    const r = pieSlices([
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "c", value: 30 },
    ]);
    expect(r[1].start).toBe(r[0].end);
    expect(r[2].start).toBe(r[1].end);
  });

  it("last slice ends at 360° (closes the pie)", () => {
    const r = pieSlices([
      { label: "a", value: 1 },
      { label: "b", value: 2 },
      { label: "c", value: 7 },
    ]);
    expect(r.at(-1)!.end).toBeCloseTo(360, 6);
  });

  it("fractions sum to 1 (total mass conservation)", () => {
    const r = pieSlices([
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "c", value: 70 },
    ]);
    const total = r.reduce((s, v) => s + v.fraction, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("preserves input order in output", () => {
    const r = pieSlices([
      { label: "Z", value: 5 },
      { label: "A", value: 5 },
      { label: "M", value: 5 },
    ]);
    expect(r.map((s) => s.label)).toEqual(["Z", "A", "M"]);
  });

  it("ignores negative total (sum ≤ 0 → empty)", () => {
    // Negative values cancel out — defensive guard.
    expect(pieSlices([{ label: "a", value: -10 }])).toEqual([]);
  });

  it("preserves the original `label` + `value` fields on each slice", () => {
    const r = pieSlices([{ label: "Sales", value: 1500 }]);
    expect(r[0].label).toBe("Sales");
    expect(r[0].value).toBe(1500);
  });
});

describe("charts/format/formatNullableN", () => {
  it("null → em-dash placeholder", () => {
    expect(formatNullableN(null)).toBe("—");
  });

  it("undefined → em-dash placeholder", () => {
    expect(formatNullableN(undefined)).toBe("—");
  });

  it("0 is shown (not treated as empty)", () => {
    expect(formatNullableN(0)).toBe("0");
  });

  it("negative numbers delegate to formatN", () => {
    expect(formatNullableN(-2500)).toBe("-2.5k");
  });

  it("M tier delegates", () => {
    expect(formatNullableN(2_500_000)).toBe("2.5M");
  });

  it("k tier delegates", () => {
    expect(formatNullableN(1500)).toBe("1.5k");
  });

  it("matches formatN output for every non-null value (delegation invariant)", () => {
    const samples = [0, 1, 500, 999, 1000, 12345, 1_000_000, 5_500_000, -300];
    for (const n of samples) {
      expect(formatNullableN(n)).toBe(formatN(n));
    }
  });
});
