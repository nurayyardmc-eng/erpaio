import { describe, it, expect } from "vitest";
import { calculateHealthScore } from "./healthScore";

const zero = {
  userMessages: 0,
  assistantMessages: 0,
  errors: 0,
  feedbackGiven: 0,
  cacheSuccess: 0,
  cacheFail: 0,
  daysActive: 0,
};

describe("analytics/healthScore/calculateHealthScore", () => {
  it("zero usage → score 0, grade F", () => {
    const r = calculateHealthScore(zero);
    expect(r.score).toBe(0);
    expect(r.grade).toBe("F");
  });

  it("perfect tenant: max activity + 100% quality + full feedback + cache hits + 20+ days → A", () => {
    const r = calculateHealthScore({
      userMessages: 200, // > 100 cap
      assistantMessages: 200,
      errors: 0,
      feedbackGiven: 200, // 100%
      cacheSuccess: 100,
      cacheFail: 0,
      daysActive: 30, // > 20 cap
    });
    // weights: activity=25 + quality=25 + feedback=15 + cache=15 + day=20 = 100
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("activity caps at 1.0 (100 userMessages = 200 userMessages)", () => {
    const a = calculateHealthScore({ ...zero, userMessages: 100 });
    const b = calculateHealthScore({ ...zero, userMessages: 500 });
    expect(a.signals.activity).toBe(1);
    expect(b.signals.activity).toBe(1);
  });

  it("daysActive caps at 1.0 (20 days = 50 days)", () => {
    const a = calculateHealthScore({ ...zero, daysActive: 20 });
    const b = calculateHealthScore({ ...zero, daysActive: 50 });
    // dayRate is internal — observed via score: 20-day rate = 1.0 → 20 score pts
    expect(a.score).toBe(20);
    expect(b.score).toBe(20);
  });

  it("qualityRate: half errors → 0.5", () => {
    const r = calculateHealthScore({
      ...zero,
      assistantMessages: 100,
      errors: 50,
    });
    expect(r.signals.qualityRate).toBeCloseTo(0.5, 5);
    expect(r.signals.errorRate).toBeCloseTo(0.5, 5);
  });

  it("no assistantMessages → qualityRate/feedbackRate/errorRate all 0 (avoid div/0)", () => {
    const r = calculateHealthScore({
      ...zero,
      userMessages: 50,
      assistantMessages: 0,
      errors: 0,
    });
    expect(r.signals.qualityRate).toBe(0);
    expect(r.signals.feedbackRate).toBe(0);
    expect(r.signals.errorRate).toBe(0);
  });

  it("cacheHitRate: 3 success + 1 fail → 0.75", () => {
    const r = calculateHealthScore({
      ...zero,
      cacheSuccess: 3,
      cacheFail: 1,
    });
    expect(r.signals.cacheHitRate).toBeCloseTo(0.75, 5);
  });

  it("zero cache → cacheHitRate 0 (no div/0)", () => {
    const r = calculateHealthScore({ ...zero });
    expect(r.signals.cacheHitRate).toBe(0);
  });

  describe("grade buckets", () => {
    it("score ≥ 85 → A", () => {
      // Tune input: activity=1 (25), quality=1 (25), feedback=1 (15), cache=1 (15), day=10/20=0.5 (10) = 90
      const r = calculateHealthScore({
        userMessages: 100,
        assistantMessages: 100,
        errors: 0,
        feedbackGiven: 100,
        cacheSuccess: 50,
        cacheFail: 0,
        daysActive: 10,
      });
      expect(r.score).toBe(90);
      expect(r.grade).toBe("A");
    });

    it("score ≥ 70 < 85 → B", () => {
      // activity=1 (25), quality=0.6 (15), feedback=0.6 (9), cache=1 (15), day=1 (20) = 84
      const r = calculateHealthScore({
        userMessages: 100,
        assistantMessages: 100,
        errors: 40,
        feedbackGiven: 60,
        cacheSuccess: 10,
        cacheFail: 0,
        daysActive: 20,
      });
      expect(r.score).toBeGreaterThanOrEqual(70);
      expect(r.score).toBeLessThan(85);
      expect(r.grade).toBe("B");
    });

    it("score 40-54 → D", () => {
      // activity=0.5 (12.5), quality=0.5 (12.5), feedback=0 (0), cache=0 (0),
      // day=15/20=0.75 (15) = 40 (exact boundary → D bucket)
      const r = calculateHealthScore({
        userMessages: 50,
        assistantMessages: 50,
        errors: 25,
        feedbackGiven: 0,
        cacheSuccess: 0,
        cacheFail: 0,
        daysActive: 15,
      });
      expect(r.score).toBeGreaterThanOrEqual(40);
      expect(r.score).toBeLessThan(55);
      expect(r.grade).toBe("D");
    });

    it("score < 40 → F", () => {
      // Low everything
      const r = calculateHealthScore({ ...zero, userMessages: 5 });
      expect(r.grade).toBe("F");
    });
  });

  it("signals.daysActive returned as-is (not capped in output)", () => {
    const r = calculateHealthScore({ ...zero, daysActive: 50 });
    expect(r.signals.daysActive).toBe(50);
  });

  it("score is integer (rounded)", () => {
    const r = calculateHealthScore({
      userMessages: 33,
      assistantMessages: 33,
      errors: 7,
      feedbackGiven: 5,
      cacheSuccess: 11,
      cacheFail: 3,
      daysActive: 5,
    });
    expect(Number.isInteger(r.score)).toBe(true);
  });
});

import { healthScoreGrade } from "./healthScore";

describe("analytics/healthScoreGrade", () => {
  describe("boundaries (≥ inclusive)", () => {
    it("100 → A", () => expect(healthScoreGrade(100)).toBe("A"));
    it("85 → A (inclusive)", () => expect(healthScoreGrade(85)).toBe("A"));
    it("84 → B (just below A)", () => expect(healthScoreGrade(84)).toBe("B"));
    it("70 → B (inclusive)", () => expect(healthScoreGrade(70)).toBe("B"));
    it("69 → C (just below B)", () => expect(healthScoreGrade(69)).toBe("C"));
    it("55 → C (inclusive)", () => expect(healthScoreGrade(55)).toBe("C"));
    it("54 → D (just below C)", () => expect(healthScoreGrade(54)).toBe("D"));
    it("40 → D (inclusive)", () => expect(healthScoreGrade(40)).toBe("D"));
    it("39 → F (just below D)", () => expect(healthScoreGrade(39)).toBe("F"));
    it("0 → F", () => expect(healthScoreGrade(0)).toBe("F"));
  });

  describe("out of range (defensive)", () => {
    it("> 100 still A", () => expect(healthScoreGrade(150)).toBe("A"));
    it("negative still F", () => expect(healthScoreGrade(-10)).toBe("F"));
    it("NaN → F (no boundary matches)", () => expect(healthScoreGrade(NaN)).toBe("F"));
  });

  describe("typical case sweep", () => {
    it("samples produce expected grade", () => {
      expect(healthScoreGrade(95)).toBe("A");
      expect(healthScoreGrade(75)).toBe("B");
      expect(healthScoreGrade(60)).toBe("C");
      expect(healthScoreGrade(45)).toBe("D");
      expect(healthScoreGrade(20)).toBe("F");
    });
  });
});
