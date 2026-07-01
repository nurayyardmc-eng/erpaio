import { describe, it, expect } from "vitest";
import { normalizeQuestion, hashQuestion } from "./queryCache";

describe("normalizeQuestion", () => {
  it("trim + lowercase", () => {
    expect(normalizeQuestion("  HELLO World  ")).toBe("hello world");
  });

  it("collapse whitespace", () => {
    expect(normalizeQuestion("a   b\t\nc")).toBe("a b c");
  });

  it("Türkçe karakterler korunur", () => {
    expect(normalizeQuestion("Ürün satışı")).toBe("ürün satışı");
  });
});

describe("hashQuestion", () => {
  it("aynı normalize → aynı hash", () => {
    const a = hashQuestion("Bu ay satışlar?", "tenant1", "conn1");
    const b = hashQuestion("  bu ay satışlar?  ", "tenant1", "conn1");
    expect(a).toBe(b);
  });

  it("farklı tenant → farklı hash", () => {
    const a = hashQuestion("test", "tenant1", "conn1");
    const b = hashQuestion("test", "tenant2", "conn1");
    expect(a).not.toBe(b);
  });

  it("farklı bağlantı → farklı hash (cross-connection cache poisoning önlenir)", () => {
    const a = hashQuestion("test", "tenant1", "conn-postgres");
    const b = hashQuestion("test", "tenant1", "conn-mssql");
    expect(a).not.toBe(b);
  });

  it("farklı soru → farklı hash", () => {
    const a = hashQuestion("question 1", "tenant1", "conn1");
    const b = hashQuestion("question 2", "tenant1", "conn1");
    expect(a).not.toBe(b);
  });

  it("64-char hex (SHA-256)", () => {
    const h = hashQuestion("test", "tenant1", "conn1");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
