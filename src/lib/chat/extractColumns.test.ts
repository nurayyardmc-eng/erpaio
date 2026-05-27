import { describe, it, expect } from "vitest";
import { extractColumns } from "./extractColumns";

describe("chat/extractColumns", () => {
  it("returns keys of first row", () => {
    expect(extractColumns([{ a: 1, b: 2, c: 3 }])).toEqual(["a", "b", "c"]);
  });

  it("returns [] for empty array", () => {
    expect(extractColumns([])).toEqual([]);
  });

  it("returns [] for null", () => {
    expect(extractColumns(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(extractColumns(undefined)).toEqual([]);
  });

  it("uses ONLY first row keys (heterogeneous arrays not flattened)", () => {
    const rows = [
      { a: 1, b: 2 },
      { c: 3, d: 4 },
    ];
    expect(extractColumns(rows)).toEqual(["a", "b"]);
  });

  it("preserves insertion order (v8 deterministic for non-int keys)", () => {
    expect(extractColumns([{ z: 1, a: 2, m: 3 }])).toEqual(["z", "a", "m"]);
  });

  it("returns [] for row with no own properties ({})", () => {
    expect(extractColumns([{}])).toEqual([]);
  });

  it("handles single-column result", () => {
    expect(extractColumns([{ total: 42 }])).toEqual(["total"]);
  });

  it("Türkçe / unicode column names preserved", () => {
    expect(extractColumns([{ ürün: "x", şehir: "y" }])).toEqual(["ürün", "şehir"]);
  });
});
