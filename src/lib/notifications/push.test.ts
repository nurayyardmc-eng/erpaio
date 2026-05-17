import { describe, it, expect } from "vitest";
import { chunkArray, EXPO_PUSH_BATCH_SIZE } from "./push";

describe("notifications/push", () => {
  describe("chunkArray", () => {
    it("empty array → empty result", () => {
      expect(chunkArray([], 10)).toEqual([]);
    });

    it("single chunk when items fit", () => {
      expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });

    it("splits into multiple chunks", () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("exact multiple → no trailing partial", () => {
      expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("works with size 1", () => {
      expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it("throws on zero size", () => {
      expect(() => chunkArray([1], 0)).toThrow();
    });

    it("throws on negative size", () => {
      expect(() => chunkArray([1], -1)).toThrow();
    });

    it("preserves order across chunks", () => {
      const input = Array.from({ length: 250 }, (_, i) => i);
      const chunks = chunkArray(input, 100);
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(100);
      expect(chunks[2]).toHaveLength(50);
      // Flatten and compare
      expect(chunks.flat()).toEqual(input);
    });

    it("works for objects (token payloads)", () => {
      const tokens = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const chunks = chunkArray(tokens, 2);
      expect(chunks).toEqual([[{ id: "a" }, { id: "b" }], [{ id: "c" }]]);
    });
  });

  describe("EXPO_PUSH_BATCH_SIZE", () => {
    it("is 100 (Expo API documented limit)", () => {
      expect(EXPO_PUSH_BATCH_SIZE).toBe(100);
    });

    it("250 tokens → 3 batches", () => {
      const tokens = Array.from({ length: 250 }, (_, i) => `t${i}`);
      const chunks = chunkArray(tokens, EXPO_PUSH_BATCH_SIZE);
      expect(chunks.length).toBe(3);
    });

    it("100 tokens → exactly 1 batch (not 2 with empty trailing)", () => {
      const tokens = Array.from({ length: 100 }, (_, i) => `t${i}`);
      expect(chunkArray(tokens, EXPO_PUSH_BATCH_SIZE).length).toBe(1);
    });
  });
});
