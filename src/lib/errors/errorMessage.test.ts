import { describe, it, expect } from "vitest";
import { errorMessage } from "./errorMessage";

describe("errors/errorMessage", () => {
  it("Error instance → .message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("Error subclass → .message", () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "CustomError";
      }
    }
    expect(errorMessage(new CustomError("custom"))).toBe("custom");
  });

  it("string → string itself (not 'Error: string')", () => {
    expect(errorMessage("just a string")).toBe("just a string");
  });

  it("number → coerced via String()", () => {
    expect(errorMessage(42)).toBe("42");
  });

  it("null → 'null'", () => {
    expect(errorMessage(null)).toBe("null");
  });

  it("undefined → 'undefined'", () => {
    expect(errorMessage(undefined)).toBe("undefined");
  });

  it("plain object → '[object Object]' (consistent with String coercion)", () => {
    expect(errorMessage({ message: "fake" })).toBe("[object Object]");
  });

  it("empty Error message → empty string", () => {
    expect(errorMessage(new Error(""))).toBe("");
  });

  it("TypeError / RangeError treated as Error", () => {
    expect(errorMessage(new TypeError("type"))).toBe("type");
    expect(errorMessage(new RangeError("range"))).toBe("range");
  });

  it("array → coerced via String", () => {
    expect(errorMessage([1, 2, 3])).toBe("1,2,3");
  });
});
