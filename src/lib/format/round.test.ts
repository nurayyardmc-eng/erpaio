import { describe, it, expect } from "vitest";
import { round2 } from "./round";

describe("format/round round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(2.345)).toBe(2.35);
    expect(round2(2.344)).toBe(2.34);
  });

  it("returns a number, not a string", () => {
    expect(typeof round2(1.23)).toBe("number");
  });

  it("strips trailing zeros (numeric, not fixed-width string)", () => {
    expect(round2(1.2)).toBe(1.2);
    expect(round2(3)).toBe(3);
  });

  it("handles negatives", () => {
    expect(round2(-1.239)).toBe(-1.24);
  });

  it("matches Number(x.toFixed(2)) exactly (the replaced idiom)", () => {
    for (const x of [0, 1.005, 2.345, -0.555, 99.999, 0.1 + 0.2]) {
      expect(round2(x)).toBe(Number(x.toFixed(2)));
    }
  });

  it("zero stays zero", () => {
    expect(round2(0)).toBe(0);
  });
});
