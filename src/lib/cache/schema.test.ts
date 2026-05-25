import { describe, it, expect } from "vitest";
import { formatSchemaRows } from "./schema";

describe("cache/schema/formatSchemaRows", () => {
  it("empty rows → empty string", () => {
    expect(formatSchemaRows([])).toBe("");
  });

  it("single column single table → 'Table: col(type)'", () => {
    expect(
      formatSchemaRows([
        { TABLE_NAME: "Orders", COLUMN_NAME: "id", DATA_TYPE: "int" },
      ]),
    ).toBe("Orders: id(int)");
  });

  it("multiple columns same table → comma-separated", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "Orders", COLUMN_NAME: "id", DATA_TYPE: "int" },
      { TABLE_NAME: "Orders", COLUMN_NAME: "total", DATA_TYPE: "decimal" },
      { TABLE_NAME: "Orders", COLUMN_NAME: "createdAt", DATA_TYPE: "datetime" },
    ]);
    expect(out).toBe("Orders: id(int), total(decimal), createdAt(datetime)");
  });

  it("multiple tables → newline-separated", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "Orders", COLUMN_NAME: "id", DATA_TYPE: "int" },
      { TABLE_NAME: "Users", COLUMN_NAME: "email", DATA_TYPE: "varchar" },
    ]);
    expect(out).toBe("Orders: id(int)\nUsers: email(varchar)");
  });

  it("column order preserved within table (input order)", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "T", COLUMN_NAME: "z", DATA_TYPE: "int" },
      { TABLE_NAME: "T", COLUMN_NAME: "a", DATA_TYPE: "int" },
    ]);
    expect(out).toBe("T: z(int), a(int)");
  });

  it("table order preserved (first-seen)", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "Z", COLUMN_NAME: "x", DATA_TYPE: "int" },
      { TABLE_NAME: "A", COLUMN_NAME: "y", DATA_TYPE: "int" },
    ]);
    expect(out.split("\n")[0].startsWith("Z:")).toBe(true);
    expect(out.split("\n")[1].startsWith("A:")).toBe(true);
  });

  it("interleaved rows still grouped per table", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "Orders", COLUMN_NAME: "id", DATA_TYPE: "int" },
      { TABLE_NAME: "Users", COLUMN_NAME: "id", DATA_TYPE: "uuid" },
      { TABLE_NAME: "Orders", COLUMN_NAME: "total", DATA_TYPE: "decimal" },
    ]);
    expect(out).toBe("Orders: id(int), total(decimal)\nUsers: id(uuid)");
  });

  it("output has exactly N-1 newlines for N tables", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "A", COLUMN_NAME: "x", DATA_TYPE: "int" },
      { TABLE_NAME: "B", COLUMN_NAME: "x", DATA_TYPE: "int" },
      { TABLE_NAME: "C", COLUMN_NAME: "x", DATA_TYPE: "int" },
    ]);
    expect(out.split("\n")).toHaveLength(3);
  });

  it("special characters in names not escaped (verbatim)", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "[ŞIPARIŞ]", COLUMN_NAME: "MÜŞTERI_ID", DATA_TYPE: "int" },
    ]);
    expect(out).toBe("[ŞIPARIŞ]: MÜŞTERI_ID(int)");
  });

  it("duplicate columns within table appear twice (no dedup)", () => {
    const out = formatSchemaRows([
      { TABLE_NAME: "T", COLUMN_NAME: "id", DATA_TYPE: "int" },
      { TABLE_NAME: "T", COLUMN_NAME: "id", DATA_TYPE: "int" },
    ]);
    expect(out).toBe("T: id(int), id(int)");
  });
});
