import { describe, it, expect } from "vitest";
import { sseFrame } from "./sse";

describe("http/sse/sseFrame", () => {
  it("format: 'event: NAME\\ndata: JSON\\n\\n'", () => {
    expect(sseFrame("hello", { x: 1 })).toBe('event: hello\ndata: {"x":1}\n\n');
  });

  it("ends with exactly two newlines (record terminator)", () => {
    const out = sseFrame("ping", null);
    expect(out.endsWith("\n\n")).toBe(true);
    // exactly two trailing — not three.
    expect(out.endsWith("\n\n\n")).toBe(false);
  });

  it("event line and data line separated by a single \\n", () => {
    const out = sseFrame("e", 1);
    expect(out).toBe("event: e\ndata: 1\n\n");
  });

  it("never emits literal \\r (Unix newlines only)", () => {
    expect(sseFrame("x", { msg: "hi" })).not.toMatch(/\r/);
  });

  it("JSON-encodes objects (so embedded newlines are escaped)", () => {
    const out = sseFrame("e", { msg: "line1\nline2" });
    // The literal \n inside the string is escaped as \\n in JSON.
    expect(out).toBe('event: e\ndata: {"msg":"line1\\nline2"}\n\n');
  });

  it("JSON-encodes strings (quotes around the value)", () => {
    expect(sseFrame("e", "hello")).toBe('event: e\ndata: "hello"\n\n');
  });

  it("JSON-encodes null", () => {
    expect(sseFrame("done", null)).toBe("event: done\ndata: null\n\n");
  });

  it("JSON-encodes undefined → 'undefined' string from JSON.stringify (special)", () => {
    // JSON.stringify(undefined) === undefined → template renders "undefined"
    // This is intentional behavior — caller should pass null.
    expect(sseFrame("done", undefined)).toBe("event: done\ndata: undefined\n\n");
  });

  it("JSON-encodes arrays", () => {
    expect(sseFrame("rows", [1, 2, 3])).toBe("event: rows\ndata: [1,2,3]\n\n");
  });

  it("event name passed verbatim (no escaping/normalization)", () => {
    // SSE spec: event name must not contain newlines. Caller responsibility.
    const out = sseFrame("error", { err: "boom" });
    expect(out.split("\n")[0]).toBe("event: error");
  });

  it("safe for unicode payload (JSON.stringify handles encoding)", () => {
    const out = sseFrame("e", { name: "Şirket — Türkçe" });
    expect(out).toContain("Şirket — Türkçe");
  });

  it("frame has exactly 3 newlines (event LF, data LF, terminator LF)", () => {
    // event: x\ndata: 1\n\n → 3 LF chars total.
    const out = sseFrame("x", 1);
    expect((out.match(/\n/g) || []).length).toBe(3);
  });

  it("deeply nested objects encode correctly", () => {
    const data = { a: { b: { c: [1, "two", null] } } };
    const out = sseFrame("e", data);
    expect(out).toBe('event: e\ndata: {"a":{"b":{"c":[1,"two",null]}}}\n\n');
  });
});
