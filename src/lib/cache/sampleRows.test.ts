import { describe, it, expect } from "vitest";
import { sampleRowsToPromptContext } from "./sampleRows";

describe("cache/sampleRows/sampleRowsToPromptContext", () => {
  it("empty samples → header only (no table sections)", () => {
    const ctx = sampleRowsToPromptContext({});
    expect(ctx).toContain("ÖRNEK SATIRLAR");
    // No "###" table headers
    expect(ctx).not.toMatch(/###/);
  });

  it("empty rows for a table → table skipped", () => {
    const ctx = sampleRowsToPromptContext({ EmptyTable: [] });
    expect(ctx).not.toContain("### EmptyTable");
  });

  it("single table single row — pairs joined with |", () => {
    const ctx = sampleRowsToPromptContext({
      Users: [{ id: 1, name: "Ali", active: true }],
    });
    expect(ctx).toContain("### Users");
    expect(ctx).toContain("id=1 | name=\"Ali\" | active=true");
  });

  it("multiple rows render separately", () => {
    const ctx = sampleRowsToPromptContext({
      T: [
        { x: 1 },
        { x: 2 },
        { x: 3 },
      ],
    });
    const matches = ctx.match(/x=\d/g);
    expect(matches).toEqual(["x=1", "x=2", "x=3"]);
  });

  it("formatValue: null → NULL", () => {
    const ctx = sampleRowsToPromptContext({ T: [{ a: null }] });
    expect(ctx).toContain("a=NULL");
  });

  it("formatValue: undefined → NULL", () => {
    const ctx = sampleRowsToPromptContext({ T: [{ a: undefined } as Record<string, unknown>] });
    expect(ctx).toContain("a=NULL");
  });

  it("formatValue: number → bare numeric (no quotes)", () => {
    const ctx = sampleRowsToPromptContext({ T: [{ n: 42, f: 3.14 }] });
    expect(ctx).toContain("n=42");
    expect(ctx).toContain("f=3.14");
  });

  it("formatValue: boolean → true/false (no quotes)", () => {
    const ctx = sampleRowsToPromptContext({ T: [{ y: true, n: false }] });
    expect(ctx).toContain("y=true");
    expect(ctx).toContain("n=false");
  });

  it("formatValue: string → quoted", () => {
    const ctx = sampleRowsToPromptContext({ T: [{ s: "hello" }] });
    expect(ctx).toContain("s=\"hello\"");
  });

  it("multiple tables — each gets header", () => {
    const ctx = sampleRowsToPromptContext({
      Users: [{ id: 1 }],
      Orders: [{ id: 2 }],
    });
    expect(ctx).toContain("### Users");
    expect(ctx).toContain("### Orders");
  });
});
