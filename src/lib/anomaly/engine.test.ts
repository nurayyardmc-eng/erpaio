import { describe, it, expect } from "vitest";
import { runDetector } from "./engine";
import type { MetricQuery } from "./queries";

const baseQuery: MetricQuery = {
  key: "test_metric",
  label: "Test metriği",
  description: "...",
  schedule: "hourly",
  algorithm: "zscore",
  sql: "SELECT 1 AS metric_value",
};

describe("anomaly/engine/runDetector", () => {
  it("zscore: <5 history → not enough data, isAnomaly false", () => {
    const r = runDetector({ ...baseQuery, algorithm: "zscore" }, 100, [10, 20]);
    expect(r.algorithm).toBe("zscore");
    expect(r.isAnomaly).toBe(false);
  });

  it("zscore: stable history then outlier → anomaly", () => {
    const r = runDetector(
      { ...baseQuery, algorithm: "zscore" },
      10000,
      [100, 102, 98, 101, 99, 100, 103, 97],
    );
    expect(r.algorithm).toBe("zscore");
    expect(r.isAnomaly).toBe(true);
  });

  it("zscore: direction='spike' filters drops", () => {
    // Drop after stable history; spike-only direction → no anomaly
    const r = runDetector(
      { ...baseQuery, algorithm: "zscore", direction: "spike" },
      0,
      [100, 102, 98, 101, 99, 100, 103, 97],
    );
    expect(r.isAnomaly).toBe(false);
  });

  it("moving_avg: routes to detectMovingAverage", () => {
    const r = runDetector(
      { ...baseQuery, algorithm: "moving_avg" },
      100,
      [100, 102, 98, 101, 99],
    );
    expect(r.algorithm).toBe("moving_avg");
  });

  it("threshold: parses rules from query.config", () => {
    const r = runDetector(
      {
        ...baseQuery,
        algorithm: "threshold",
        config: {
          rules: [
            { condition: "gt", value: 100, severity: "high", message: "çok yüksek" },
          ],
        },
      },
      150,
      [],
    );
    expect(r.algorithm).toBe("threshold");
    expect(r.isAnomaly).toBe(true);
    expect(r.severity).toBe("high");
  });

  it("threshold: missing config.rules defaults to [] → no rule matches → not anomaly", () => {
    const r = runDetector(
      { ...baseQuery, algorithm: "threshold", config: undefined },
      150,
      [],
    );
    expect(r.isAnomaly).toBe(false);
  });

  it("threshold: rule below value → not anomaly", () => {
    const r = runDetector(
      {
        ...baseQuery,
        algorithm: "threshold",
        config: {
          rules: [{ condition: "gt", value: 100, severity: "low" }],
        },
      },
      50,
      [],
    );
    expect(r.isAnomaly).toBe(false);
  });

  it("threshold: lt/lte/gte/eq conditions all dispatch", () => {
    const cases: Array<{ cond: "lt" | "lte" | "gte" | "eq"; val: number; cur: number; expectAnomaly: boolean }> = [
      { cond: "lt", val: 100, cur: 50, expectAnomaly: true },
      { cond: "lte", val: 100, cur: 100, expectAnomaly: true },
      { cond: "gte", val: 100, cur: 100, expectAnomaly: true },
      { cond: "eq", val: 0, cur: 0, expectAnomaly: true },
    ];
    for (const c of cases) {
      const r = runDetector(
        {
          ...baseQuery,
          algorithm: "threshold",
          config: { rules: [{ condition: c.cond, value: c.val, severity: "medium" }] },
        },
        c.cur,
        [],
      );
      expect(r.isAnomaly).toBe(c.expectAnomaly);
    }
  });

  it("unknown algorithm → throws explicit error", () => {
    expect(() =>
      runDetector(
        { ...baseQuery, algorithm: "kmeans" as unknown as MetricQuery["algorithm"] },
        100,
        [],
      ),
    ).toThrow(/Bilinmeyen algoritma/);
  });

  it("metricLabel forwarded to detector (visible in message)", () => {
    const r = runDetector(
      { ...baseQuery, algorithm: "zscore", label: "Özel etiket" },
      0,
      [1, 2],
    );
    // <5 history path: message contains the label
    expect(r.message).toContain("Özel etiket");
  });
});
