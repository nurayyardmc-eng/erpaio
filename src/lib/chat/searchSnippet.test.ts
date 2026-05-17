import { describe, expect, it } from "vitest";
import { extractSnippet, normalizeSearchQuery } from "./searchSnippet";

describe("chat/searchSnippet", () => {
  describe("extractSnippet", () => {
    it("empty content → empty snippet", () => {
      const r = extractSnippet("", "anything");
      expect(r).toEqual({ text: "", matchStart: -1, matchLength: 0 });
    });

    it("empty query + short content → full content, no match", () => {
      const r = extractSnippet("kısa içerik", "");
      expect(r.text).toBe("kısa içerik");
      expect(r.matchStart).toBe(-1);
    });

    it("empty query + long content → truncated", () => {
      const r = extractSnippet("x".repeat(200), "");
      expect(r.text.length).toBeLessThanOrEqual(160);
      expect(r.text.endsWith("…")).toBe(true);
    });

    it("query found in middle → snippet with leading + trailing ellipsis", () => {
      const content = "a".repeat(100) + " HEDEF " + "b".repeat(100);
      const r = extractSnippet(content, "HEDEF");
      expect(r.text).toContain("HEDEF");
      expect(r.text.startsWith("…")).toBe(true);
      expect(r.text.endsWith("…")).toBe(true);
      expect(r.matchStart).toBeGreaterThanOrEqual(0);
      expect(r.matchLength).toBe(5);
    });

    it("query at start of content → no leading ellipsis", () => {
      const r = extractSnippet("Sipariş sayısı bugün", "Sipariş");
      expect(r.text.startsWith("…")).toBe(false);
      expect(r.matchStart).toBe(0);
      expect(r.matchLength).toBe(7);
    });

    it("query at end of content → no trailing ellipsis", () => {
      const r = extractSnippet("Bugün toplam ne kadar", "kadar");
      expect(r.text.endsWith("…")).toBe(false);
      expect(r.matchLength).toBe(5);
    });

    it("case-insensitive match", () => {
      const r = extractSnippet("Bugün TOPLAM 42 sipariş", "toplam");
      expect(r.matchStart).toBeGreaterThan(0);
      expect(r.matchLength).toBe(6);
    });

    it("query not found in long content → truncated head, no match", () => {
      const r = extractSnippet("x".repeat(200), "yok-bu-içerik");
      expect(r.matchStart).toBe(-1);
      expect(r.text.endsWith("…")).toBe(true);
      expect(r.text.length).toBeLessThanOrEqual(160);
    });

    it("query not found in short content → full content, no match", () => {
      const r = extractSnippet("merhaba dünya", "olmayan");
      expect(r.text).toBe("merhaba dünya");
      expect(r.matchStart).toBe(-1);
    });

    it("collapses multiple whitespace into single space", () => {
      const r = extractSnippet("kelime1   \n  kelime2\t\tkelime3", "kelime2");
      expect(r.text).toContain("kelime1 kelime2 kelime3");
    });

    it("custom maxLen honored", () => {
      const content = "a".repeat(500);
      const r = extractSnippet(content, "", 50);
      expect(r.text.length).toBeLessThanOrEqual(50);
    });

    it("Turkish chars in query handled", () => {
      const r = extractSnippet("Şubat ayında satışlar düştü", "satışlar");
      expect(r.matchStart).toBeGreaterThan(0);
      expect(r.matchLength).toBe(8);
    });
  });

  describe("normalizeSearchQuery", () => {
    it("null → null", () => {
      expect(normalizeSearchQuery(null)).toBeNull();
    });

    it("undefined → null", () => {
      expect(normalizeSearchQuery(undefined)).toBeNull();
    });

    it("empty string → null", () => {
      expect(normalizeSearchQuery("")).toBeNull();
    });

    it("single char → null (too short)", () => {
      expect(normalizeSearchQuery("a")).toBeNull();
    });

    it("only whitespace → null", () => {
      expect(normalizeSearchQuery("   ")).toBeNull();
    });

    it("2 chars → returned as-is (minimum bound)", () => {
      expect(normalizeSearchQuery("ab")).toBe("ab");
    });

    it("trims leading/trailing whitespace", () => {
      expect(normalizeSearchQuery("  hello  ")).toBe("hello");
    });

    it("over 80 char → truncated (DoS guard)", () => {
      const long = "x".repeat(200);
      const r = normalizeSearchQuery(long);
      expect(r?.length).toBe(80);
    });
  });
});
