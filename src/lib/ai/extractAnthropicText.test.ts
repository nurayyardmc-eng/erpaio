import { describe, it, expect } from "vitest";
import { extractAnthropicText } from "./extractAnthropicText";

describe("ai/extractAnthropicText", () => {
  it("extracts text from a single text block", () => {
    const msg = { content: [{ type: "text", text: "hello world" }] };
    expect(extractAnthropicText(msg)).toBe("hello world");
  });

  it("trims whitespace around extracted text", () => {
    const msg = { content: [{ type: "text", text: "  hello  " }] };
    expect(extractAnthropicText(msg)).toBe("hello");
  });

  it("returns empty string (default fallback) when no text block", () => {
    const msg = { content: [{ type: "tool_use", text: "noop" }] };
    // No text-type block → "".trim() → "" (NOT fallback) per original
    // semantics: only nullish block.text triggers fallback.
    expect(extractAnthropicText(msg)).toBe("");
  });

  it("returns empty array fallback when block.text undefined (follow-ups path)", () => {
    const msg = { content: [{ type: "text", text: undefined }] };
    expect(extractAnthropicText(msg, "[]")).toBe("[]");
  });

  it("custom fallback applied for nullish text", () => {
    const msg = { content: [{ type: "text", text: undefined }] };
    expect(extractAnthropicText(msg, "DEFAULT")).toBe("DEFAULT");
  });

  it("picks FIRST text block when multiple present", () => {
    const msg = {
      content: [
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ],
    };
    expect(extractAnthropicText(msg)).toBe("first");
  });

  it("ignores non-text blocks before text block", () => {
    const msg = {
      content: [
        { type: "tool_use" },
        { type: "text", text: "the answer" },
      ],
    };
    expect(extractAnthropicText(msg)).toBe("the answer");
  });

  it("empty content array → '' (no fallback because trim of '' is '')", () => {
    expect(extractAnthropicText({ content: [] })).toBe("");
    expect(extractAnthropicText({ content: [] }, "FALL")).toBe("");
  });

  it("multiline text trimmed at ends but preserves internal newlines", () => {
    const msg = { content: [{ type: "text", text: "\n\nline1\nline2\n  " }] };
    expect(extractAnthropicText(msg)).toBe("line1\nline2");
  });

  it("whitespace-only text trimmed to empty string (NOT fallback)", () => {
    const msg = { content: [{ type: "text", text: "   " }] };
    // "   ".trim() → "" which is non-nullish, so fallback NOT applied
    expect(extractAnthropicText(msg, "FALL")).toBe("");
  });
});
