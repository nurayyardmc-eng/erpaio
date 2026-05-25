import { describe, it, expect } from "vitest";
import {
  SEVERITY_RANK,
  meetsSeverityThreshold,
  compareSeverity,
} from "./severity";

describe("format/severity SEVERITY_RANK", () => {
  it("4 known levels with ordered ranks (low=1 < medium=2 < high=3 < critical=4)", () => {
    expect(SEVERITY_RANK.low).toBe(1);
    expect(SEVERITY_RANK.medium).toBe(2);
    expect(SEVERITY_RANK.high).toBe(3);
    expect(SEVERITY_RANK.critical).toBe(4);
  });

  it("strict ascending ordering (regression marker)", () => {
    expect(SEVERITY_RANK.low).toBeLessThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeLessThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeLessThan(SEVERITY_RANK.critical);
  });
});

describe("format/severity/meetsSeverityThreshold", () => {
  describe("basic comparisons", () => {
    it("critical meets any minimum", () => {
      expect(meetsSeverityThreshold("critical", "low")).toBe(true);
      expect(meetsSeverityThreshold("critical", "medium")).toBe(true);
      expect(meetsSeverityThreshold("critical", "high")).toBe(true);
      expect(meetsSeverityThreshold("critical", "critical")).toBe(true);
    });

    it("low only meets low minimum", () => {
      expect(meetsSeverityThreshold("low", "low")).toBe(true);
      expect(meetsSeverityThreshold("low", "medium")).toBe(false);
      expect(meetsSeverityThreshold("low", "high")).toBe(false);
      expect(meetsSeverityThreshold("low", "critical")).toBe(false);
    });

    it("medium meets low + medium", () => {
      expect(meetsSeverityThreshold("medium", "low")).toBe(true);
      expect(meetsSeverityThreshold("medium", "medium")).toBe(true);
      expect(meetsSeverityThreshold("medium", "high")).toBe(false);
    });

    it("high meets low + medium + high", () => {
      expect(meetsSeverityThreshold("high", "high")).toBe(true);
      expect(meetsSeverityThreshold("high", "critical")).toBe(false);
    });
  });

  describe("equality (≥ semantics, not >)", () => {
    it("equal severity → true (≥)", () => {
      expect(meetsSeverityThreshold("medium", "medium")).toBe(true);
    });
  });

  describe("unknown values (defensive)", () => {
    it("unknown actual → false (rank 0 < anything)", () => {
      expect(meetsSeverityThreshold("urgent", "low")).toBe(false);
    });

    it("unknown minimum → false unless actual is critical (rank 4)", () => {
      expect(meetsSeverityThreshold("high", "extreme")).toBe(false);
      expect(meetsSeverityThreshold("critical", "extreme")).toBe(true);
    });
  });
});

describe("format/severity/compareSeverity", () => {
  it("descending sort order (higher rank first)", () => {
    const list = ["low", "critical", "medium", "high"];
    list.sort(compareSeverity);
    expect(list).toEqual(["critical", "high", "medium", "low"]);
  });

  it("returns negative when b > a", () => {
    expect(compareSeverity("low", "critical")).toBeGreaterThan(0);
  });

  it("returns positive when a > b", () => {
    expect(compareSeverity("critical", "low")).toBeLessThan(0);
  });

  it("returns 0 when equal", () => {
    expect(compareSeverity("medium", "medium")).toBe(0);
  });

  it("unknown values rank 0 — sorted to end", () => {
    const list = ["unknown", "critical", "?", "low"];
    list.sort(compareSeverity);
    expect(list[0]).toBe("critical");
    expect(list[1]).toBe("low");
    // unknown values both rank 0 → sort stable order preserved
  });

  it("multi-element sort produces strict descending rank chain", () => {
    const items = ["medium", "low", "critical", "high", "medium", "low"];
    items.sort(compareSeverity);
    // Verify each item's rank ≥ next item's rank.
    for (let i = 0; i < items.length - 1; i++) {
      expect(SEVERITY_RANK[items[i]] ?? 0).toBeGreaterThanOrEqual(
        SEVERITY_RANK[items[i + 1]] ?? 0,
      );
    }
  });
});
