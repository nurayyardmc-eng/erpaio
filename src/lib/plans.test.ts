import { describe, it, expect } from "vitest";
import { PLANS, hasFeature, getPlan, isPlanId } from "./plans";

describe("plans", () => {
  describe("PLANS constant", () => {
    it("3 plan defined: starter/pro/enterprise", () => {
      expect(Object.keys(PLANS).sort()).toEqual(["enterprise", "pro", "starter"]);
    });

    it("budget escalates: starter < pro < enterprise", () => {
      expect(PLANS.starter.monthlyTokenBudget).toBeLessThan(PLANS.pro.monthlyTokenBudget);
      expect(PLANS.pro.monthlyTokenBudget).toBeLessThan(PLANS.enterprise.monthlyTokenBudget);
    });

    it("user limit escalates: starter < pro < enterprise", () => {
      expect(PLANS.starter.maxUsers).toBeLessThan(PLANS.pro.maxUsers);
      expect(PLANS.pro.maxUsers).toBeLessThan(PLANS.enterprise.maxUsers);
    });

    it("connection limit escalates", () => {
      expect(PLANS.starter.maxConnections).toBeLessThan(PLANS.pro.maxConnections);
      expect(PLANS.pro.maxConnections).toBeLessThan(PLANS.enterprise.maxConnections);
    });

    it("features grow monotonically (subset relationship)", () => {
      const starter = new Set(PLANS.starter.features);
      const pro = new Set(PLANS.pro.features);
      const enterprise = new Set(PLANS.enterprise.features);
      for (const f of starter) expect(pro.has(f)).toBe(true);
      for (const f of pro) expect(enterprise.has(f)).toBe(true);
    });

    it("enterprise has tier-exclusive features (on_prem_agent, sso, dedicated_support)", () => {
      expect(PLANS.enterprise.features).toContain("on_prem_agent");
      expect(PLANS.enterprise.features).toContain("sso");
      expect(PLANS.enterprise.features).toContain("dedicated_support");
      expect(PLANS.pro.features).not.toContain("on_prem_agent");
      expect(PLANS.starter.features).not.toContain("mfa");
    });
  });

  describe("hasFeature", () => {
    it("true when plan has feature", () => {
      expect(hasFeature("pro", "mfa")).toBe(true);
      expect(hasFeature("enterprise", "sso")).toBe(true);
      expect(hasFeature("starter", "chat")).toBe(true);
    });

    it("false when plan doesn't have feature", () => {
      expect(hasFeature("starter", "mfa")).toBe(false);
      expect(hasFeature("pro", "sso")).toBe(false);
    });

    it("false on unknown plan (defensive)", () => {
      expect(hasFeature("unknown-plan", "chat")).toBe(false);
      expect(hasFeature("", "chat")).toBe(false);
    });

    it("false on empty feature string", () => {
      expect(hasFeature("pro", "")).toBe(false);
    });
  });

  describe("isPlanId", () => {
    it("true only for the three known plan ids", () => {
      expect(isPlanId("starter")).toBe(true);
      expect(isPlanId("pro")).toBe(true);
      expect(isPlanId("enterprise")).toBe(true);
    });
    it("false for unknown / empty / null / undefined (blocks unvalidated plan writes)", () => {
      expect(isPlanId("free")).toBe(false);
      expect(isPlanId("")).toBe(false);
      expect(isPlanId(null)).toBe(false);
      expect(isPlanId(undefined)).toBe(false);
    });
  });

  describe("getPlan", () => {
    it("returns features for known plan", () => {
      expect(getPlan("pro").maxUsers).toBe(25);
      expect(getPlan("enterprise").maxConnections).toBe(100);
    });

    it("unknown plan → fallback to starter (defensive)", () => {
      const p = getPlan("unknown");
      expect(p.maxUsers).toBe(PLANS.starter.maxUsers);
    });

    it("empty plan → fallback to starter", () => {
      expect(getPlan("").maxUsers).toBe(PLANS.starter.maxUsers);
    });
  });
});
