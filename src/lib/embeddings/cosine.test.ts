import { describe, it, expect } from "vitest";
import { hexToVec, vecToHex, cosineSim, topK } from "./cosine";

describe("embeddings/cosine", () => {
  describe("hexToVec / vecToHex", () => {
    it("roundtrips float32 vector through hex (precision ok within FP epsilon)", () => {
      const orig = [0.1, -0.5, 1.0, 3.14159, -2.71828];
      const hex = vecToHex(orig);
      const back = hexToVec(hex);
      expect(back.length).toBe(orig.length);
      for (let i = 0; i < orig.length; i++) {
        expect(back[i]).toBeCloseTo(orig[i], 5);
      }
    });

    it("vecToHex produces 8 hex chars per float (4 bytes)", () => {
      const v = [1.0, 2.0, 3.0];
      const hex = vecToHex(v);
      expect(hex.length).toBe(v.length * 8);
    });

    it("hexToVec on empty hex returns empty array", () => {
      const v = hexToVec("");
      expect(v).toEqual([]);
    });

    it("vecToHex on empty vec returns empty string", () => {
      const hex = vecToHex([]);
      expect(hex).toBe("");
    });
  });

  describe("cosineSim", () => {
    it("identical vectors → 1.0", () => {
      const v = [1, 2, 3];
      expect(cosineSim(v, v)).toBeCloseTo(1, 10);
    });

    it("orthogonal vectors → 0", () => {
      expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0, 10);
    });

    it("opposite direction → -1", () => {
      expect(cosineSim([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);
    });

    it("length mismatch → 0 (defensive)", () => {
      expect(cosineSim([1, 2, 3], [1, 2])).toBe(0);
    });

    it("zero vector → 0 (avoids NaN div-by-zero)", () => {
      expect(cosineSim([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSim([1, 2, 3], [0, 0, 0])).toBe(0);
      expect(cosineSim([0, 0], [0, 0])).toBe(0);
    });

    it("scale invariance — magnitude doesn't matter, only direction", () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6]; // 2x same direction
      expect(cosineSim(a, b)).toBeCloseTo(1, 10);
    });
  });

  describe("topK", () => {
    const cands = [
      { id: "a", vec: [1, 0, 0] },
      { id: "b", vec: [0.9, 0.1, 0] },
      { id: "c", vec: [0, 1, 0] },
      { id: "d", vec: [0, 0, 1] },
      { id: "e", vec: [0.5, 0.5, 0] },
    ];

    it("returns sorted by similarity desc", () => {
      const r = topK([1, 0, 0], cands, 3);
      expect(r.length).toBe(3);
      expect(r[0].id).toBe("a"); // identical
      // r[1] should be b (close to a) or e (50% a-like)
      expect(["b", "e"]).toContain(r[1].id);
      // last should have lower score than first
      expect(r[2].score).toBeLessThanOrEqual(r[0].score);
    });

    it("respects k parameter", () => {
      const r = topK([1, 0, 0], cands, 2);
      expect(r.length).toBe(2);
    });

    it("k > candidates returns all", () => {
      const r = topK([1, 0, 0], cands, 100);
      expect(r.length).toBe(cands.length);
    });

    it("k=0 returns empty", () => {
      const r = topK([1, 0, 0], cands, 0);
      expect(r).toEqual([]);
    });

    it("default k=10 when omitted", () => {
      const r = topK([1, 0, 0], cands);
      expect(r.length).toBe(cands.length); // less than 10 candidates
    });
  });
});
