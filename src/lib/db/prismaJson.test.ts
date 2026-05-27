import { describe, it, expect } from "vitest";
import { toPrismaJson } from "./prismaJson";

describe("db/toPrismaJson", () => {
  it("plain object passes through unchanged", () => {
    const input = { a: 1, b: "x", c: true };
    const out = toPrismaJson(input);
    expect(out).toEqual(input);
  });

  it("nested object deep-clones", () => {
    const input = { outer: { inner: { value: 42 } } };
    const out = toPrismaJson(input) as { outer: { inner: { value: number } } };
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
    expect(out.outer).not.toBe(input.outer);
  });

  it("strips undefined fields (JSON spec)", () => {
    const input = { a: 1, b: undefined, c: 2 };
    const out = toPrismaJson(input);
    expect(out).toEqual({ a: 1, c: 2 });
    expect((out as Record<string, unknown>).b).toBeUndefined();
  });

  it("strips functions (JSON spec)", () => {
    const input = { a: 1, fn: () => "x", b: 2 };
    const out = toPrismaJson(input);
    expect(out).toEqual({ a: 1, b: 2 });
  });

  it("Date → ISO string", () => {
    const d = new Date("2026-05-27T12:00:00Z");
    const out = toPrismaJson({ when: d }) as { when: string };
    expect(out.when).toBe("2026-05-27T12:00:00.000Z");
  });

  it("Infinity/NaN → null", () => {
    const out = toPrismaJson({ inf: Infinity, nan: NaN, neg: -Infinity }) as {
      inf: number | null;
      nan: number | null;
      neg: number | null;
    };
    expect(out.inf).toBeNull();
    expect(out.nan).toBeNull();
    expect(out.neg).toBeNull();
  });

  it("arrays preserved", () => {
    const out = toPrismaJson([1, "two", { three: 3 }]);
    expect(out).toEqual([1, "two", { three: 3 }]);
  });

  it("null preserved", () => {
    expect(toPrismaJson(null)).toBeNull();
  });

  it("Symbol-keyed properties dropped", () => {
    const sym = Symbol("k");
    const input = { a: 1, [sym]: "secret" };
    const out = toPrismaJson(input);
    expect(out).toEqual({ a: 1 });
  });

  it("returns NEW object reference (defensive copy)", () => {
    const input = { a: 1 };
    const out = toPrismaJson(input);
    expect(out).not.toBe(input);
  });
});
