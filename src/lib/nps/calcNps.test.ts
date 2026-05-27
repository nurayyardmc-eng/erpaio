import { describe, it, expect } from "vitest";
import { npsBucket, calcNps, aggregateNps } from "./calcNps";

describe("nps/npsBucket", () => {
  it("score 9 and 10 → promoter", () => {
    expect(npsBucket(9)).toBe("promoter");
    expect(npsBucket(10)).toBe("promoter");
  });

  it("score 7 and 8 → passive", () => {
    expect(npsBucket(7)).toBe("passive");
    expect(npsBucket(8)).toBe("passive");
  });

  it("score 0-6 → detractor", () => {
    for (let s = 0; s <= 6; s++) expect(npsBucket(s)).toBe("detractor");
  });

  it("boundary at 7 inclusive (passive starts)", () => {
    expect(npsBucket(6)).toBe("detractor");
    expect(npsBucket(7)).toBe("passive");
  });

  it("boundary at 9 inclusive (promoter starts)", () => {
    expect(npsBucket(8)).toBe("passive");
    expect(npsBucket(9)).toBe("promoter");
  });
});

describe("nps/calcNps", () => {
  it("all promoters → +100", () => {
    expect(calcNps(10, 0, 10)).toBe(100);
  });

  it("all detractors → -100", () => {
    expect(calcNps(0, 10, 10)).toBe(-100);
  });

  it("equal promoters/detractors → 0", () => {
    expect(calcNps(5, 5, 10)).toBe(0);
  });

  it("passives counted in total but not in formula", () => {
    expect(calcNps(5, 0, 10)).toBe(50); // 5 promoters, 5 passives, 0 detractors
  });

  it("rounds to integer", () => {
    expect(calcNps(1, 0, 3)).toBe(33);
    expect(calcNps(2, 0, 3)).toBe(67);
  });

  it("total 0 → 0 (no division by zero)", () => {
    expect(calcNps(0, 0, 0)).toBe(0);
  });

  it("negative total (defensive) → 0", () => {
    expect(calcNps(0, 0, -5)).toBe(0);
  });
});

describe("nps/aggregateNps", () => {
  it("empty array → all zeros, nps 0", () => {
    expect(aggregateNps([])).toEqual({
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
      nps: 0,
    });
  });

  it("mixed scores correctly bucketed", () => {
    const r = aggregateNps([10, 9, 8, 7, 6, 5, 0]);
    expect(r.promoters).toBe(2);
    expect(r.passives).toBe(2);
    expect(r.detractors).toBe(3);
    expect(r.total).toBe(7);
  });

  it("all promoters → nps +100", () => {
    expect(aggregateNps([9, 10, 9, 10]).nps).toBe(100);
  });

  it("all detractors → nps -100", () => {
    expect(aggregateNps([0, 1, 2, 3, 4, 5, 6]).nps).toBe(-100);
  });

  it("all passives → nps 0 (passives excluded from formula)", () => {
    expect(aggregateNps([7, 8, 7, 8]).nps).toBe(0);
  });

  it("single score 10 → nps 100", () => {
    expect(aggregateNps([10]).nps).toBe(100);
  });
});
