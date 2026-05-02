import { describe, it, expect } from "vitest";
import { detectZScore, detectMovingAverage, detectThreshold } from "./detectors";

describe("detectZScore", () => {
  it("yetersiz veri (history < 5) → anomaly değil", () => {
    const r = detectZScore({ current: 100, history: [50, 60, 70], metricLabel: "satış" });
    expect(r.isAnomaly).toBe(false);
    expect(r.severity).toBe("low");
  });

  it("normal aralıkta → anomaly değil", () => {
    const r = detectZScore({
      current: 101,
      history: [100, 102, 98, 101, 99, 103, 100, 102],
      metricLabel: "satış",
    });
    expect(r.isAnomaly).toBe(false);
  });

  it("büyük sapma → critical anomaly", () => {
    const r = detectZScore({
      current: 5000,
      history: [100, 102, 98, 101, 99, 103, 100, 102],
      metricLabel: "satış",
    });
    expect(r.isAnomaly).toBe(true);
    expect(r.severity).toBe("critical");
  });

  it("direction=drop, ama yükseliş → anomaly değil", () => {
    const r = detectZScore({
      current: 5000,
      history: [100, 102, 98, 101, 99, 103, 100, 102],
      metricLabel: "satış",
      direction: "drop",
    });
    expect(r.isAnomaly).toBe(false);
  });

  it("direction=drop ve düşüş → anomaly", () => {
    const r = detectZScore({
      current: 1,
      history: [100, 102, 98, 101, 99, 103, 100, 102],
      metricLabel: "satış",
      direction: "drop",
    });
    expect(r.isAnomaly).toBe(true);
  });

  it("stdDev=0 (sabit history) ve değişim → medium anomaly", () => {
    const r = detectZScore({
      current: 50,
      history: [10, 10, 10, 10, 10, 10],
      metricLabel: "x",
    });
    expect(r.isAnomaly).toBe(true);
    expect(r.severity).toBe("medium");
  });
});

describe("detectMovingAverage", () => {
  it("yetersiz veri (< 3) → anomaly değil", () => {
    const r = detectMovingAverage({ current: 100, history: [50, 60], metricLabel: "x" });
    expect(r.isAnomaly).toBe(false);
  });

  it("avg=0 ve değişim → anomaly", () => {
    const r = detectMovingAverage({
      current: 50,
      history: [0, 0, 0],
      metricLabel: "x",
    });
    expect(r.isAnomaly).toBe(true);
  });

  it("%50 sapma → critical default eşikte", () => {
    const r = detectMovingAverage({
      current: 200,
      history: [100, 100, 100],
      metricLabel: "x",
    });
    expect(r.isAnomaly).toBe(true);
    expect(["high", "critical"]).toContain(r.severity);
  });

  it("direction=spike, düşüş → anomaly değil", () => {
    const r = detectMovingAverage({
      current: 50,
      history: [100, 100, 100],
      metricLabel: "x",
      direction: "spike",
    });
    expect(r.isAnomaly).toBe(false);
  });
});

describe("detectThreshold", () => {
  it("eşik altında → anomaly değil", () => {
    const r = detectThreshold({
      current: 5,
      metricLabel: "stok",
      rules: [{ condition: "gte", value: 50, severity: "critical" }],
    });
    expect(r.isAnomaly).toBe(false);
  });

  it("eşik üstünde → severity'e göre anomaly", () => {
    const r = detectThreshold({
      current: 60,
      metricLabel: "stok",
      rules: [
        { condition: "gte", value: 50, severity: "critical" },
        { condition: "gte", value: 20, severity: "high" },
      ],
    });
    expect(r.isAnomaly).toBe(true);
    expect(r.severity).toBe("critical");
  });

  it("multiple rules → highest severity match seçilir", () => {
    const r = detectThreshold({
      current: 25,
      metricLabel: "stok",
      rules: [
        { condition: "gte", value: 50, severity: "critical" },
        { condition: "gte", value: 20, severity: "high" },
        { condition: "gte", value: 10, severity: "medium" },
      ],
    });
    expect(r.severity).toBe("high");
  });

  it("lt condition", () => {
    const r = detectThreshold({
      current: 5,
      metricLabel: "stok",
      rules: [{ condition: "lt", value: 10, severity: "high" }],
    });
    expect(r.isAnomaly).toBe(true);
  });
});
