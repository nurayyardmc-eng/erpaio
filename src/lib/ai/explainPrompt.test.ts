import { describe, it, expect } from "vitest";
import { buildExplainPrompt } from "./explainPrompt";

describe("ai/explainPrompt/buildExplainPrompt", () => {
  describe("basic structure", () => {
    it("includes question quoted", () => {
      const r = buildExplainPrompt("Bu ay satış?", "SELECT 1", [{ x: 1 }], 1);
      expect(r).toContain('Soru: "Bu ay satış?"');
    });

    it("includes SQL after 'SQL:'", () => {
      const r = buildExplainPrompt("q", "SELECT * FROM Orders", [], 0);
      expect(r).toContain("SQL: SELECT * FROM Orders");
    });

    it("includes totalRows count", () => {
      const r = buildExplainPrompt("q", "x", [], 42);
      expect(r).toContain("Toplam satır: 42");
    });

    it("ends with 'Kısa Türkçe yorumun:'", () => {
      const r = buildExplainPrompt("q", "x", [], 0);
      expect(r.trimEnd().endsWith("Kısa Türkçe yorumun:")).toBe(true);
    });

    it("topRows serialized as JSON array", () => {
      const r = buildExplainPrompt("q", "x", [{ a: 1 }, { a: 2 }], 2);
      expect(r).toContain('[{"a":1},{"a":2}]');
    });
  });

  describe("truncation contracts", () => {
    it("SQL longer than 800 chars truncated", () => {
      const longSql = "SELECT '" + "x".repeat(2000) + "'";
      const r = buildExplainPrompt("q", longSql, [], 0);
      const sqlLine = r.split("\n").find((l) => l.startsWith("SQL: "))!;
      // "SQL: " prefix + 800 chars = 805 chars total
      expect(sqlLine.length).toBe(805);
    });

    it("SQL ≤ 800 chars NOT truncated", () => {
      const shortSql = "SELECT * FROM Users";
      const r = buildExplainPrompt("q", shortSql, [], 0);
      expect(r).toContain(shortSql);
    });

    it("topRows trimmed to first 10 (regression marker)", () => {
      const many = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      const r = buildExplainPrompt("q", "x", many, 20);
      // Should contain id:9 (the 10th row), but not id:10
      expect(r).toContain('"id":9');
      expect(r).not.toContain('"id":10');
    });

    it("topRows ≤ 10 included verbatim", () => {
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const r = buildExplainPrompt("q", "x", rows, 3);
      expect(r).toContain('[{"id":1},{"id":2},{"id":3}]');
    });
  });

  describe("edge cases", () => {
    it("empty topRows → '[]'", () => {
      const r = buildExplainPrompt("q", "x", [], 0);
      expect(r).toContain("İlk satırlar:\n[]");
    });

    it("totalRows 0 with empty rows", () => {
      const r = buildExplainPrompt("q", "x", [], 0);
      expect(r).toContain("Toplam satır: 0");
    });

    it("Turkish characters in question preserved", () => {
      const r = buildExplainPrompt("Şirket müşterileri kimler?", "x", [], 0);
      expect(r).toContain("Şirket müşterileri kimler?");
    });

    it("special chars in SQL (quotes) NOT escaped (caller is AI)", () => {
      const sql = `SELECT * WHERE x = 'value'`;
      const r = buildExplainPrompt("q", sql, [], 0);
      expect(r).toContain(sql);
    });
  });

  describe("output invariants", () => {
    it("multi-line format with newlines (5 sections)", () => {
      const r = buildExplainPrompt("q", "x", [], 0);
      // Soru / SQL / Toplam / İlk satırlar / Kısa Türkçe — 5 lines + JSON
      const lines = r.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(5);
    });
  });
});
