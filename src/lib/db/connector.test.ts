import { describe, expect, it } from "vitest";
import { SLOW_QUERY_THRESHOLD_MS, truncateSqlForLog } from "./connector";

describe("db/connector", () => {
  describe("truncateSqlForLog", () => {
    it("empty string → empty", () => {
      expect(truncateSqlForLog("")).toBe("");
    });

    it("whitespace-only → empty", () => {
      expect(truncateSqlForLog("   \n\t  ")).toBe("");
    });

    it("collapses newlines/tabs into single spaces", () => {
      const sql = "SELECT *\n  FROM\torders\n WHERE id = 1";
      expect(truncateSqlForLog(sql)).toBe("SELECT * FROM orders WHERE id = 1");
    });

    it("returns short SQL unchanged (after collapse)", () => {
      expect(truncateSqlForLog("SELECT 1")).toBe("SELECT 1");
    });

    it("truncates to max length with ellipsis (default 500)", () => {
      const long = "x".repeat(600);
      const out = truncateSqlForLog(long);
      expect(out.length).toBe(500);
      expect(out.endsWith("…")).toBe(true);
    });

    it("honors custom max", () => {
      const out = truncateSqlForLog("ABCDEFGHIJ", 5);
      // 5 chars total: 4 from src + "…"
      expect(out).toBe("ABCD…");
      expect(out.length).toBe(5);
    });

    it("at exact max → no truncation/ellipsis", () => {
      const exact = "y".repeat(500);
      expect(truncateSqlForLog(exact)).toBe(exact);
    });

    it("trims surrounding whitespace before truncation", () => {
      expect(truncateSqlForLog("   SELECT 1   ")).toBe("SELECT 1");
    });
  });

  describe("SLOW_QUERY_THRESHOLD_MS", () => {
    it("is a positive integer", () => {
      expect(Number.isInteger(SLOW_QUERY_THRESHOLD_MS)).toBe(true);
      expect(SLOW_QUERY_THRESHOLD_MS).toBeGreaterThan(0);
    });

    it("default 3000ms (3s) — production'da küçültülmeden önce intentional", () => {
      expect(SLOW_QUERY_THRESHOLD_MS).toBe(3000);
    });
  });
});
