import { describe, it, expect } from "vitest";
import {
  METRIC_QUERIES,
  getHourlyQueries,
  getDailyQueries,
  findQueryByKey,
} from "./queries";

describe("anomaly/queries", () => {
  describe("METRIC_QUERIES integrity", () => {
    it("non-empty", () => {
      expect(METRIC_QUERIES.length).toBeGreaterThan(0);
    });

    it("all keys unique", () => {
      const keys = METRIC_QUERIES.map((q) => q.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("every query has required fields", () => {
      for (const q of METRIC_QUERIES) {
        expect(q.key).toBeTruthy();
        expect(q.label).toBeTruthy();
        expect(q.sql).toBeTruthy();
        expect(["hourly", "daily"]).toContain(q.schedule);
        expect(["zscore", "moving_avg", "threshold"]).toContain(q.algorithm);
      }
    });

    it("SQL contains metric_value column alias", () => {
      // Engine's executeMetricQuery requires this column name
      for (const q of METRIC_QUERIES) {
        expect(q.sql.toLowerCase()).toContain("metric_value");
      }
    });

    it("threshold queries declare rules in config", () => {
      const thresholds = METRIC_QUERIES.filter((q) => q.algorithm === "threshold");
      for (const q of thresholds) {
        const rules = (q.config?.rules as unknown[]) ?? [];
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getHourlyQueries", () => {
    it("returns only hourly queries", () => {
      const out = getHourlyQueries();
      expect(out.every((q) => q.schedule === "hourly")).toBe(true);
    });

    it("returns a subset of METRIC_QUERIES", () => {
      const out = getHourlyQueries();
      expect(out.length).toBeLessThanOrEqual(METRIC_QUERIES.length);
    });
  });

  describe("getDailyQueries", () => {
    it("returns only daily queries", () => {
      const out = getDailyQueries();
      expect(out.every((q) => q.schedule === "daily")).toBe(true);
    });

    it("union with hourly equals full set", () => {
      const hourly = getHourlyQueries().length;
      const daily = getDailyQueries().length;
      expect(hourly + daily).toBe(METRIC_QUERIES.length);
    });
  });

  describe("findQueryByKey", () => {
    it("returns query by key", () => {
      const first = METRIC_QUERIES[0];
      expect(findQueryByKey(first.key)).toBe(first);
    });

    it("returns undefined for unknown key", () => {
      expect(findQueryByKey("not-a-real-key")).toBeUndefined();
    });
  });
});
