import { describe, it, expect } from "vitest";
import { computeSparkline } from "./sparkline";

describe("watchlist/sparkline", () => {
  it("empty input → hasData false, sane defaults", () => {
    const r = computeSparkline([], 10);
    expect(r.hasData).toBe(false);
    expect(r.points).toEqual([]);
    expect(r.thresholdY).toBe(0.5);
  });

  it("normalizes timestamps ASC across points (oldest → 0, newest → 1)", () => {
    const r = computeSparkline(
      [
        { value: 5, triggeredAt: "2026-05-18T12:00:00Z" }, // newest (API returns DESC, helper resorts)
        { value: 3, triggeredAt: "2026-05-17T12:00:00Z" },
        { value: 1, triggeredAt: "2026-05-16T12:00:00Z" }, // oldest
      ],
      4,
    );
    expect(r.points[0].x).toBe(0); // oldest left
    expect(r.points[2].x).toBe(1); // newest right
  });

  it("normalizes values across range including threshold", () => {
    const r = computeSparkline(
      [
        { value: 10, triggeredAt: "2026-05-16T12:00:00Z" },
        { value: 20, triggeredAt: "2026-05-17T12:00:00Z" },
      ],
      30, // threshold > max → pushes max range up
    );
    // value range now [10, 30], 30-10=20
    // y for 10 → 0, for 20 → 0.5, thresholdY → 1
    expect(r.points[0].y).toBe(0);
    expect(r.points[1].y).toBe(0.5);
    expect(r.thresholdY).toBe(1);
  });

  it("single point → x=1 (right edge)", () => {
    const r = computeSparkline(
      [{ value: 5, triggeredAt: "2026-05-18T12:00:00Z" }],
      10,
    );
    expect(r.points.length).toBe(1);
    expect(r.points[0].x).toBe(1);
  });

  it("all-same values → y=0.5 (vertical center)", () => {
    const r = computeSparkline(
      [
        { value: 7, triggeredAt: "2026-05-17T12:00:00Z" },
        { value: 7, triggeredAt: "2026-05-18T12:00:00Z" },
      ],
      7,
    );
    expect(r.points.every((p) => p.y === 0.5)).toBe(true);
    expect(r.thresholdY).toBe(0.5);
  });

  it("threshold below min → thresholdY clamped to 0", () => {
    const r = computeSparkline(
      [
        { value: 20, triggeredAt: "2026-05-17T12:00:00Z" },
        { value: 30, triggeredAt: "2026-05-18T12:00:00Z" },
      ],
      10, // below min
    );
    expect(r.thresholdY).toBe(0);
  });

  it("threshold above max → thresholdY clamped to 1", () => {
    const r = computeSparkline(
      [
        { value: 5, triggeredAt: "2026-05-17T12:00:00Z" },
        { value: 8, triggeredAt: "2026-05-18T12:00:00Z" },
      ],
      100, // above max
    );
    expect(r.thresholdY).toBe(1);
  });

  it("minVal / maxVal reflect actual values (not threshold-padded)", () => {
    const r = computeSparkline(
      [
        { value: 5, triggeredAt: "2026-05-17T12:00:00Z" },
        { value: 15, triggeredAt: "2026-05-18T12:00:00Z" },
      ],
      100,
    );
    expect(r.minVal).toBe(5);
    expect(r.maxVal).toBe(15);
  });
});
