import { describe, it, expect } from "vitest";
import { linearForecast } from "./forecast";

describe("linearForecast", () => {
  it("yetersiz veri (n<3) → flat", () => {
    const r = linearForecast([10, 20], 5);
    expect(r.trend).toBe("flat");
    expect(r.forecast).toEqual([]);
  });

  it("artan trend tespit eder", () => {
    const r = linearForecast([10, 20, 30, 40, 50, 60], 3);
    expect(r.trend).toBe("rising");
    expect(r.slope).toBeGreaterThan(0);
    expect(r.forecast.length).toBe(3);
    expect(r.forecast[0].predicted).toBeGreaterThan(60);
  });

  it("azalan trend tespit eder", () => {
    const r = linearForecast([100, 80, 60, 40, 20, 5], 3);
    expect(r.trend).toBe("falling");
    expect(r.slope).toBeLessThan(0);
  });

  it("flat (yatay)", () => {
    const r = linearForecast([100, 102, 99, 101, 100, 101], 3);
    expect(r.trend).toBe("flat");
  });

  it("forecast confidence interval (95%, ±1.96*RMSE)", () => {
    const r = linearForecast([10, 20, 30, 40, 50], 1);
    const f = r.forecast[0];
    expect(f.upperBound).toBeGreaterThanOrEqual(f.predicted);
    expect(f.lowerBound).toBeLessThanOrEqual(f.predicted);
  });

  it("seasonality 7-period ile tespit edilir", () => {
    const seasonal = Array.from({ length: 28 }, (_, i) => 100 + 20 * Math.sin((2 * Math.PI * i) / 7));
    const r = linearForecast(seasonal, 7);
    expect(r.seasonality.detected).toBe(true);
    expect(r.seasonality.period).toBeGreaterThanOrEqual(2);
  });
});
