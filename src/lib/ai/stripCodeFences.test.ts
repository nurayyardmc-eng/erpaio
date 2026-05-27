import { describe, it, expect } from "vitest";
import { stripCodeFences } from "./stripCodeFences";

describe("ai/stripCodeFences", () => {
  it("strips ```json prefix", () => {
    expect(stripCodeFences("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });

  it("strips ``` (no language) prefix", () => {
    expect(stripCodeFences("```\nSELECT 1\n```")).toBe("SELECT 1");
  });

  it("case-insensitive json marker (```JSON)", () => {
    expect(stripCodeFences("```JSON\n{}\n```")).toBe("{}");
  });

  it("no fences → trimmed input", () => {
    expect(stripCodeFences("  hello  ")).toBe("hello");
  });

  it("empty string → empty", () => {
    expect(stripCodeFences("")).toBe("");
  });

  it("only fences → empty string", () => {
    expect(stripCodeFences("```\n```")).toBe("");
  });

  it("only prefix fence (no suffix) handled", () => {
    expect(stripCodeFences("```json\n{\"x\":1}")).toBe('{"x":1}');
  });

  it("only suffix fence (no prefix) handled", () => {
    expect(stripCodeFences('{"x":1}\n```')).toBe('{"x":1}');
  });

  it("preserves internal triple-backticks (only edges stripped)", () => {
    // Mid-content fences (rare) are preserved
    expect(stripCodeFences("```\nfoo ``` bar\n```")).toBe("foo ``` bar");
  });

  it("multiline JSON content preserved", () => {
    const input = "```json\n{\n  \"a\": 1,\n  \"b\": 2\n}\n```";
    const expected = '{\n  "a": 1,\n  "b": 2\n}';
    expect(stripCodeFences(input)).toBe(expected);
  });

  it("whitespace between fence and content tolerated", () => {
    expect(stripCodeFences("```json   \n  data  \n   ```")).toBe("data");
  });
});
