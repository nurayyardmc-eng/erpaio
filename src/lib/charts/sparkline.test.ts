import { describe, it, expect } from "vitest";
import { sparklinePoints } from "./sparkline";

describe("charts/sparkline/sparklinePoints", () => {
  describe("guards", () => {
    it("empty array → ''", () => {
      expect(sparklinePoints([], 100, 50)).toBe("");
    });

    it("single value → '' (cannot draw line)", () => {
      expect(sparklinePoints([42], 100, 50)).toBe("");
    });
  });

  describe("two-point line", () => {
    it("ascending 0 → 1 → diagonal top-right (y inverted)", () => {
      // values [0, 1], w=100 h=10. x: 0 / 100. y: bottom(10) / top(0).
      expect(sparklinePoints([0, 1], 100, 10)).toBe("0.0,10.0 100.0,0.0");
    });

    it("descending 1 → 0 → diagonal bottom-right", () => {
      expect(sparklinePoints([1, 0], 100, 10)).toBe("0.0,0.0 100.0,10.0");
    });
  });

  describe("x-axis distribution", () => {
    it("3 points spaced evenly across width", () => {
      const out = sparklinePoints([0, 0.5, 1], 100, 10);
      // x positions: 0, 50, 100
      expect(out.split(" ")[0]).toBe("0.0,10.0");
      expect(out.split(" ")[1]).toBe("50.0,5.0");
      expect(out.split(" ")[2]).toBe("100.0,0.0");
    });

    it("5 points spaced uniformly", () => {
      const out = sparklinePoints([1, 1, 1, 1, 1], 100, 10);
      const xs = out.split(" ").map((p) => p.split(",")[0]);
      expect(xs).toEqual(["0.0", "25.0", "50.0", "75.0", "100.0"]);
    });
  });

  describe("y-axis normalization (range)", () => {
    it("min mapped to y = height (bottom)", () => {
      const out = sparklinePoints([5, 10, 15], 100, 50);
      expect(out.split(" ")[0]).toBe("0.0,50.0"); // min=5 → y=h
    });

    it("max mapped to y = 0 (top)", () => {
      const out = sparklinePoints([5, 10, 15], 100, 50);
      expect(out.split(" ")[2]).toBe("100.0,0.0"); // max=15 → y=0
    });

    it("middle value sits between min/max", () => {
      const out = sparklinePoints([0, 5, 10], 100, 50);
      expect(out.split(" ")[1]).toBe("50.0,25.0"); // mid → y=h/2
    });
  });

  describe("constant-series guard (range = 0)", () => {
    it("all same value → all y at bottom (h)", () => {
      const out = sparklinePoints([5, 5, 5], 100, 10);
      // range = 0 || 1 = 1, (v - min) / 1 = 0, so y = h - 0 = h (bottom)
      const ys = out.split(" ").map((p) => p.split(",")[1]);
      expect(ys).toEqual(["10.0", "10.0", "10.0"]);
    });

    it("all zeros → all bottom", () => {
      const out = sparklinePoints([0, 0, 0], 100, 10);
      expect(out).toBe("0.0,10.0 50.0,10.0 100.0,10.0");
    });
  });

  describe("negative values", () => {
    it("mix of negative and positive normalized correctly", () => {
      const out = sparklinePoints([-10, 0, 10], 100, 10);
      // min=-10, max=10, range=20
      // (v - min) / range: 0, 0.5, 1.0 → y: 10, 5, 0
      expect(out).toBe("0.0,10.0 50.0,5.0 100.0,0.0");
    });
  });

  describe("dimensions", () => {
    it("rectangular viewBox supported", () => {
      const out = sparklinePoints([0, 1], 400, 50);
      expect(out).toBe("0.0,50.0 400.0,0.0");
    });

    it("zero height degenerate (all y = 0)", () => {
      const out = sparklinePoints([0, 1], 100, 0);
      const ys = out.split(" ").map((p) => p.split(",")[1]);
      expect(ys).toEqual(["0.0", "0.0"]);
    });
  });

  describe("format", () => {
    it("each coordinate uses 1 decimal place", () => {
      const out = sparklinePoints([1, 2, 3], 100, 10);
      for (const point of out.split(" ")) {
        expect(point).toMatch(/^\d+\.\d,\d+\.\d$/);
      }
    });

    it("space-separated points (SVG polyline format)", () => {
      const out = sparklinePoints([0, 1, 2], 100, 10);
      expect(out.split(" ").length).toBe(3);
    });
  });
});
