import { describe, it, expect } from "vitest";
import { truncateRows, DEFAULT_ROW_LIMIT } from "./rowLimit";

describe("chat/rowLimit/truncateRows", () => {
  it("DEFAULT_ROW_LIMIT = 500 (UX cap contract)", () => {
    expect(DEFAULT_ROW_LIMIT).toBe(500);
  });

  it("empty rows → total 0, no truncate", () => {
    expect(truncateRows([])).toEqual({
      results: [],
      total: 0,
      truncated: false,
      rowLimit: 500,
    });
  });

  it("rows under limit → all returned, truncated false", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const r = truncateRows(rows);
    expect(r.results).toEqual(rows);
    expect(r.total).toBe(50);
    expect(r.truncated).toBe(false);
  });

  it("rows exactly at limit → all returned, truncated false (boundary)", () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    const r = truncateRows(rows);
    expect(r.results).toHaveLength(500);
    expect(r.truncated).toBe(false);
  });

  it("rows over limit → sliced to 500, truncated true", () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
    const r = truncateRows(rows);
    expect(r.results).toHaveLength(500);
    expect(r.total).toBe(1500);
    expect(r.truncated).toBe(true);
    expect(r.rowLimit).toBe(500);
  });

  it("truncated results preserve original order (slice from start)", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => i);
    const r = truncateRows(rows);
    expect(r.results[0]).toBe(0);
    expect(r.results[499]).toBe(499);
  });

  it("custom limit overrides default", () => {
    const rows = Array.from({ length: 100 }, (_, i) => i);
    const r = truncateRows(rows, 10);
    expect(r.results).toHaveLength(10);
    expect(r.truncated).toBe(true);
    expect(r.rowLimit).toBe(10);
  });

  it("limit 0 → empty results, truncated if any input", () => {
    const r = truncateRows([1, 2, 3], 0);
    expect(r.results).toEqual([]);
    expect(r.truncated).toBe(true);
    expect(r.total).toBe(3);
  });

  it("limit larger than rows → all returned, truncated false", () => {
    const r = truncateRows([1, 2], 100);
    expect(r.results).toEqual([1, 2]);
    expect(r.truncated).toBe(false);
  });

  it("does not mutate input array", () => {
    const rows = [{ a: 1 }, { a: 2 }];
    const copy = JSON.parse(JSON.stringify(rows));
    truncateRows(rows);
    expect(rows).toEqual(copy);
  });

  it("type-preserving (returns same element type)", () => {
    const rows: Array<{ name: string; count: number }> = [
      { name: "a", count: 1 },
      { name: "b", count: 2 },
    ];
    const r = truncateRows(rows);
    expect(r.results[0].name).toBe("a");
    expect(r.results[1].count).toBe(2);
  });

  it("works with mixed-type arrays", () => {
    const r = truncateRows([1, "two", null, { x: 1 }]);
    expect(r.results).toHaveLength(4);
    expect(r.truncated).toBe(false);
  });
});
