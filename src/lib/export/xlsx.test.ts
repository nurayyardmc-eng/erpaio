import { describe, it, expect } from "vitest";
import { calculateColumnWidths } from "./xlsx";

describe("export/xlsx/calculateColumnWidths", () => {
  it("empty columns → empty array", () => {
    expect(calculateColumnWidths([], [])).toEqual([]);
  });

  it("no rows → header length controls width", () => {
    const widths = calculateColumnWidths([], ["customer_name"]);
    // "customer_name".length = 13; +2 padding = 15
    expect(widths).toEqual([{ wch: 15 }]);
  });

  it("min clamp 10: short header + empty data → wch=10", () => {
    expect(calculateColumnWidths([], ["id"])).toEqual([{ wch: 10 }]);
  });

  it("max clamp 50: huge value capped", () => {
    const widths = calculateColumnWidths(
      [{ note: "x".repeat(500) }],
      ["note"],
    );
    expect(widths).toEqual([{ wch: 50 }]);
  });

  it("longest cell value wins over header", () => {
    const widths = calculateColumnWidths(
      [{ k: "short" }, { k: "muchlongerstringhere" }, { k: "tiny" }],
      ["k"],
    );
    // longest "muchlongerstringhere" = 20 + 2 = 22
    expect(widths).toEqual([{ wch: 22 }]);
  });

  it("multiple columns independent", () => {
    const widths = calculateColumnWidths(
      [{ a: "x", b: "long-value-here" }],
      ["a", "b"],
    );
    expect(widths).toEqual([{ wch: 10 }, { wch: 17 }]);
  });

  it("null/undefined cell values coerce to empty string", () => {
    const widths = calculateColumnWidths(
      [{ k: null }, { k: undefined }],
      ["k"],
    );
    // "k".length = 1; min clamp 10 wins
    expect(widths).toEqual([{ wch: 10 }]);
  });

  it("numeric values stringified for length", () => {
    const widths = calculateColumnWidths(
      [{ price: 1234567890 }],
      ["price"],
    );
    // "1234567890".length = 10; +2 padding = 12
    expect(widths).toEqual([{ wch: 12 }]);
  });

  it("preserves column order (output index matches input index)", () => {
    const widths = calculateColumnWidths(
      [{ z: "longvaluehere1", a: "x" }],
      ["z", "a"],
    );
    expect(widths[0].wch).toBeGreaterThan(widths[1].wch);
  });

  it("missing column key in row → empty string (not crash)", () => {
    const widths = calculateColumnWidths(
      [{ a: "value" }],
      ["a", "ghost"],
    );
    // ghost column → only header "ghost" length = 5; min clamp 10
    expect(widths[1].wch).toBe(10);
  });

  it("object value stringified via String() → '[object Object]'", () => {
    const widths = calculateColumnWidths(
      [{ k: { nested: true } }],
      ["k"],
    );
    // "[object Object]".length = 15; +2 = 17
    expect(widths).toEqual([{ wch: 17 }]);
  });
});
