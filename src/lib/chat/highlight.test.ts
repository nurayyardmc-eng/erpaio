import { describe, it, expect } from "vitest";
import { sliceHighlight } from "./highlight";

describe("chat/highlight/sliceHighlight", () => {
  describe("happy path", () => {
    it("middle match → before + match + after", () => {
      expect(sliceHighlight("hello world", 6, 5)).toEqual({
        before: "hello ",
        match: "world",
        after: "",
      });
    });

    it("match at start → empty before", () => {
      expect(sliceHighlight("hello world", 0, 5)).toEqual({
        before: "",
        match: "hello",
        after: " world",
      });
    });

    it("match at end → empty after", () => {
      expect(sliceHighlight("hello world", 6, 5)).toEqual({
        before: "hello ",
        match: "world",
        after: "",
      });
    });

    it("match in middle → both ends populated", () => {
      expect(sliceHighlight("hello world today", 6, 5)).toEqual({
        before: "hello ",
        match: "world",
        after: " today",
      });
    });
  });

  describe("no-highlight branches", () => {
    it("matchStart -1 → whole text as before", () => {
      expect(sliceHighlight("hello", -1, 5)).toEqual({
        before: "hello",
        match: "",
        after: "",
      });
    });

    it("matchStart < 0 (any negative) → no highlight", () => {
      expect(sliceHighlight("hi", -100, 1)).toEqual({
        before: "hi",
        match: "",
        after: "",
      });
    });

    it("matchLength 0 → no highlight", () => {
      expect(sliceHighlight("hi", 1, 0)).toEqual({
        before: "hi",
        match: "",
        after: "",
      });
    });

    it("matchLength negative → no highlight", () => {
      expect(sliceHighlight("hi", 1, -5)).toEqual({
        before: "hi",
        match: "",
        after: "",
      });
    });
  });

  describe("edge cases", () => {
    it("empty text + valid range → all empty", () => {
      expect(sliceHighlight("", 0, 5)).toEqual({
        before: "",
        match: "",
        after: "",
      });
    });

    it("matchStart beyond text length → match empty, after empty", () => {
      // slice clamps; before = full text, match/after = "".
      expect(sliceHighlight("hi", 100, 5)).toEqual({
        before: "hi",
        match: "",
        after: "",
      });
    });

    it("matchLength longer than remaining → consumes rest", () => {
      expect(sliceHighlight("hello", 2, 100)).toEqual({
        before: "he",
        match: "llo",
        after: "",
      });
    });

    it("unicode (Turkish) preserved", () => {
      const text = "Şirket Müşteri Cari";
      const r = sliceHighlight(text, 7, 7); // "Müşteri"
      expect(r.before).toBe("Şirket ");
      expect(r.match).toBe("Müşteri");
      expect(r.after).toBe(" Cari");
    });

    it("reassembling parts reproduces original text (invariant)", () => {
      const text = "the quick brown fox";
      const r = sliceHighlight(text, 10, 5);
      expect(r.before + r.match + r.after).toBe(text);
    });

    it("non-highlight reassembly equals original (before alone)", () => {
      const text = "anything";
      const r = sliceHighlight(text, -1, 0);
      expect(r.before + r.match + r.after).toBe(text);
    });
  });
});
