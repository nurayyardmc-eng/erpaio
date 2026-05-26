import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  safeLocalGet,
  safeLocalSet,
  safeLocalRemove,
  safeLocalGetJson,
  safeLocalSetJson,
  safeLocalGetNumber,
} from "./safeLocalStorage";

// Lightweight in-memory localStorage mock attached to globalThis.window
function installWindow() {
  const store = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
  return store;
}

function uninstallWindow() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
}

describe("safeLocalStorage", () => {
  describe("SSR (window undefined)", () => {
    beforeEach(() => uninstallWindow());

    it("safeLocalGet → null", () => {
      expect(safeLocalGet("k")).toBeNull();
    });

    it("safeLocalSet → no-op (no throw)", () => {
      expect(() => safeLocalSet("k", "v")).not.toThrow();
    });

    it("safeLocalRemove → no-op", () => {
      expect(() => safeLocalRemove("k")).not.toThrow();
    });

    it("safeLocalGetJson → null", () => {
      expect(safeLocalGetJson("k")).toBeNull();
    });

    it("safeLocalGetNumber → null", () => {
      expect(safeLocalGetNumber("k")).toBeNull();
    });
  });

  describe("browser (window defined)", () => {
    beforeEach(() => installWindow());
    afterEach(() => uninstallWindow());

    it("set/get roundtrip", () => {
      safeLocalSet("name", "alice");
      expect(safeLocalGet("name")).toBe("alice");
    });

    it("get missing → null", () => {
      expect(safeLocalGet("missing")).toBeNull();
    });

    it("remove clears", () => {
      safeLocalSet("x", "y");
      safeLocalRemove("x");
      expect(safeLocalGet("x")).toBeNull();
    });

    it("setJson + getJson roundtrip", () => {
      safeLocalSetJson("obj", { a: 1, b: "two" });
      expect(safeLocalGetJson<{ a: number; b: string }>("obj")).toEqual({ a: 1, b: "two" });
    });

    it("getJson on invalid JSON → null (no throw)", () => {
      safeLocalSet("bad", "{not json");
      expect(safeLocalGetJson("bad")).toBeNull();
    });

    it("setJson on circular ref → no-op (no throw)", () => {
      const a: Record<string, unknown> = {};
      a.self = a;
      expect(() => safeLocalSetJson("cir", a)).not.toThrow();
      expect(safeLocalGet("cir")).toBeNull();
    });

    it("getNumber parses numeric string", () => {
      safeLocalSet("count", "42");
      expect(safeLocalGetNumber("count")).toBe(42);
    });

    it("getNumber returns null for non-numeric", () => {
      safeLocalSet("x", "abc");
      expect(safeLocalGetNumber("x")).toBeNull();
    });

    it("getNumber handles negative + float", () => {
      safeLocalSet("a", "-3.14");
      expect(safeLocalGetNumber("a")).toBe(-3.14);
    });

    it("set quota error swallowed", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = (globalThis as any).window;
      w.localStorage.setItem = vi.fn(() => { throw new Error("QuotaExceeded"); });
      expect(() => safeLocalSet("k", "v")).not.toThrow();
    });
  });
});
