import { describe, it, expect } from "vitest";
import { deterministicEmbed, embedAndStore } from "./index";
import { hexToVec, cosineSim } from "./cosine";

describe("embeddings/deterministicEmbed", () => {
  it("produces 64-dimensional vector", () => {
    const v = deterministicEmbed("test text");
    expect(v.length).toBe(64);
  });

  it("identical input → identical output (deterministic)", () => {
    const a = deterministicEmbed("müşteri listesi");
    const b = deterministicEmbed("müşteri listesi");
    expect(a).toEqual(b);
  });

  it("normalized to unit length (norm ≈ 1)", () => {
    const v = deterministicEmbed("herhangi bir cümle");
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("empty string → zero vector (no tokens)", () => {
    const v = deterministicEmbed("");
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("whitespace-only → zero vector", () => {
    const v = deterministicEmbed("    \t\n  ");
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("single-char tokens filtered out (length > 1 rule)", () => {
    const v = deterministicEmbed("a b c");
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("case insensitive — UPPER and lower produce same vector", () => {
    const lower = deterministicEmbed("müşteri raporu");
    const upper = deterministicEmbed("MÜŞTERİ RAPORU");
    // toLowerCase normalize → identical
    expect(lower).toEqual(upper);
  });

  it("Turkish accented chars (çğıöşü) preserved as tokens", () => {
    const v1 = deterministicEmbed("şirket faaliyet");
    const v2 = deterministicEmbed("sirket faaliyet");
    // Different tokens → different vectors
    expect(v1).not.toEqual(v2);
  });

  it("similar concepts produce more similar vectors (rough)", () => {
    const a = deterministicEmbed("müşteri listesi satış");
    const b = deterministicEmbed("müşteri raporu satış");
    const c = deterministicEmbed("kullanıcı oturumu güvenlik");
    // a-b share 2/3 tokens, a-c share 0
    expect(cosineSim(a, b)).toBeGreaterThan(cosineSim(a, c));
  });
});

describe("embeddings/embedAndStore", () => {
  it("returns hex string", () => {
    const hex = embedAndStore("test");
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });

  it("hex length = 8 chars per float (64-dim → 512 hex chars)", () => {
    const hex = embedAndStore("test");
    expect(hex.length).toBe(64 * 8);
  });

  it("hex roundtrips via hexToVec to original vector", () => {
    const text = "stok hareketi";
    const orig = deterministicEmbed(text);
    const hex = embedAndStore(text);
    const back = hexToVec(hex);
    for (let i = 0; i < orig.length; i++) {
      expect(back[i]).toBeCloseTo(orig[i], 5);
    }
  });
});
