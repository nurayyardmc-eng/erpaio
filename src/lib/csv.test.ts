import { describe, it, expect } from "vitest";
import { rowsToCsv } from "./csv";

describe("rowsToCsv", () => {
  it("basit satırlar", () => {
    const csv = rowsToCsv([{ a: 1, b: 2 }, { a: 3, b: 4 }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,2\n3,4");
  });

  it("comma içeriyor → quoted", () => {
    const csv = rowsToCsv([{ x: "Hello, World" }], ["x"]);
    expect(csv).toBe(`x\n"Hello, World"`);
  });

  it("quote içeriyor → escaped", () => {
    const csv = rowsToCsv([{ x: 'has "quotes"' }], ["x"]);
    expect(csv).toBe(`x\n"has ""quotes"""`);
  });

  it("newline içeriyor → quoted", () => {
    const csv = rowsToCsv([{ x: "line1\nline2" }], ["x"]);
    expect(csv).toBe(`x\n"line1\nline2"`);
  });

  it("null/undefined → boş", () => {
    const csv = rowsToCsv([{ x: null, y: undefined }], ["x", "y"]);
    expect(csv).toBe("x,y\n,");
  });

  it("nested object → JSON stringified", () => {
    const csv = rowsToCsv([{ x: { a: 1 } }], ["x"]);
    expect(csv).toContain('"{""a"":1}"');
  });

  it("missing column → boş cell", () => {
    const csv = rowsToCsv([{ a: 1 }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,");
  });
});
