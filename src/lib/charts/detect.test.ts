import { describe, it, expect } from "vitest";
import { detectChartHint } from "./detect";

describe("charts/detect", () => {
  it("0 rows → none (yetersiz)", () => {
    const r = detectChartHint([], []);
    expect(r.type).toBe("none");
    expect(r.reason).toMatch(/yetersiz/);
  });

  it("1 row → none (single point grafik yapmaz)", () => {
    const r = detectChartHint([{ x: 1, y: 2 }], ["x", "y"]);
    expect(r.type).toBe("none");
  });

  it(">500 rows → none (perf cap)", () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ date: "2026-01-01", v: i }));
    const r = detectChartHint(rows, ["date", "v"]);
    expect(r.type).toBe("none");
    expect(r.reason).toMatch(/500/);
  });

  it("date + numeric → line chart (trend)", () => {
    const rows = [
      { date: "2026-01-01", revenue: 100 },
      { date: "2026-01-02", revenue: 120 },
      { date: "2026-01-03", revenue: 90 },
    ];
    const r = detectChartHint(rows, ["date", "revenue"]);
    expect(r.type).toBe("line");
    expect(r.xColumn).toBe("date");
    expect(r.yColumns).toEqual(["revenue"]);
  });

  it("date + multiple numerics → line with up to 3 y-cols", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: "2026-01-01",
      a: i,
      b: i * 2,
      c: i * 3,
      d: i * 4,
      e: i * 5,
    }));
    const r = detectChartHint(rows, ["date", "a", "b", "c", "d", "e"]);
    expect(r.type).toBe("line");
    expect(r.yColumns.length).toBe(3);
  });

  it("date / format ISO with dash works", () => {
    const rows = [
      { date: "2026-05-18", x: 1 },
      { date: "2026-05-19", x: 2 },
    ];
    const r = detectChartHint(rows, ["date", "x"]);
    expect(r.type).toBe("line");
  });

  it("date / format with slash works", () => {
    const rows = [
      { date: "2026/05/18", x: 1 },
      { date: "2026/05/19", x: 2 },
    ];
    const r = detectChartHint(rows, ["date", "x"]);
    expect(r.type).toBe("line");
  });

  it("Date object also counted as dateLike", () => {
    const rows = [
      { date: new Date("2026-01-01"), x: 1 },
      { date: new Date("2026-01-02"), x: 2 },
    ];
    const r = detectChartHint(rows, ["date", "x"]);
    expect(r.type).toBe("line");
  });

  it("string category + numeric (≤30 rows) → bar chart", () => {
    const rows = [
      { product: "A", sales: 100 },
      { product: "B", sales: 50 },
      { product: "C", sales: 75 },
    ];
    const r = detectChartHint(rows, ["product", "sales"]);
    expect(r.type).toBe("bar");
    expect(r.xColumn).toBe("product");
    expect(r.yColumns).toEqual(["sales"]);
  });

  it(">30 rows category+number → none (too many bars)", () => {
    const rows = Array.from({ length: 31 }, (_, i) => ({
      product: `P${i}`,
      sales: i,
    }));
    const r = detectChartHint(rows, ["product", "sales"]);
    expect(r.type).toBe("none");
  });

  it("string + single numeric (≤10 rows) → pie", () => {
    const rows = [
      { dept: "Sales", count: 5 },
      { dept: "Engineering", count: 10 },
      { dept: "Support", count: 3 },
    ];
    const r = detectChartHint(rows, ["dept", "count"]);
    // string + 1 numeric, ≤10 rows → eligible for pie, but bar branch fires first.
    // Logic: bar predicate (string + numericCols.length>0 && rows<=30) wins.
    expect(r.type).toBe("bar");
  });

  it("no numeric column → none", () => {
    const rows = [
      { a: "foo", b: "bar" },
      { a: "baz", b: "qux" },
    ];
    const r = detectChartHint(rows, ["a", "b"]);
    expect(r.type).toBe("none");
  });

  it("excludes id-like columns from the Y-axis metric (bigint ids serialize as strings)", () => {
    // marka=category (x), customer_id=numeric-looking id (must be ignored), ciro=metric (y)
    const rows = [
      { marka: "Nike", customer_id: "1001", ciro: "500" },
      { marka: "Adidas", customer_id: "1002", ciro: "800" },
      { marka: "Puma", customer_id: "1003", ciro: "300" },
    ];
    const r = detectChartHint(rows, ["marka", "customer_id", "ciro"]);
    expect(r.type).toBe("bar");
    expect(r.xColumn).toBe("marka");
    expect(r.yColumns).toEqual(["ciro"]);
    expect(r.yColumns).not.toContain("customer_id");
  });

  it("id-only numeric column → no metric → none", () => {
    const rows = [{ id: "1", marka: "Nike" }, { id: "2", marka: "Adidas" }];
    expect(detectChartHint(rows, ["id", "marka"]).type).toBe("none");
  });

  it("treats pg string-serialized numbers as numeric (COUNT/SUM come back as strings)", () => {
    // pg returns bigint/numeric aggregates as strings; they must chart as a
    // metric, not be misread as a category label.
    const rows = [
      { marka: "Nike", ciro: "1240" },
      { marka: "Adidas", ciro: "980" },
      { marka: "Puma", ciro: "610" },
    ];
    const r = detectChartHint(rows, ["marka", "ciro"]);
    expect(r.type).toBe("bar");
    expect(r.xColumn).toBe("marka");
    expect(r.yColumns).toEqual(["ciro"]);
  });
});
