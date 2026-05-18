import { describe, it, expect } from "vitest";
import { trialBannerStatus } from "./banner";

const NOW = new Date("2026-05-18T12:00:00Z");
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60_000);

describe("trial/banner", () => {
  describe("trialBannerStatus", () => {
    it("non-starter plan → null", () => {
      expect(trialBannerStatus({
        plan: "pro",
        trialEndsAt: daysFromNow(5),
        subscriptionStatus: null,
      }, NOW)).toBeNull();
    });

    it("active subscription → null (Stripe upgrade)", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(5),
        subscriptionStatus: "active",
      }, NOW)).toBeNull();
    });

    it("null trialEndsAt → null (non-trial classic)", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: null,
        subscriptionStatus: null,
      }, NOW)).toBeNull();
    });

    it("invalid date string → null", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: "bad-date",
        subscriptionStatus: null,
      }, NOW)).toBeNull();
    });

    it("trialEndsAt > 14 days → null (too early)", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(20),
        subscriptionStatus: null,
      }, NOW)).toBeNull();
    });

    it("exactly 14 days → info", () => {
      const r = trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(14),
        subscriptionStatus: null,
      }, NOW);
      expect(r?.urgency).toBe("info");
      expect(r?.daysLeft).toBe(14);
    });

    it("8 days → info", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(8),
        subscriptionStatus: null,
      }, NOW)?.urgency).toBe("info");
    });

    it("7 days → warning (boundary)", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(7),
        subscriptionStatus: null,
      }, NOW)?.urgency).toBe("warning");
    });

    it("4 days → warning", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(4),
        subscriptionStatus: null,
      }, NOW)?.urgency).toBe("warning");
    });

    it("3 days → danger (boundary)", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(3),
        subscriptionStatus: null,
      }, NOW)?.urgency).toBe("danger");
    });

    it("1 day → danger", () => {
      expect(trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(1),
        subscriptionStatus: null,
      }, NOW)?.urgency).toBe("danger");
    });

    it("just expired (-1 day) → expired with negative daysLeft", () => {
      const r = trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(-1),
        subscriptionStatus: null,
      }, NOW);
      expect(r?.urgency).toBe("expired");
      expect(r?.daysLeft).toBe(-1);
    });

    it("long-expired (-30 days) → expired", () => {
      const r = trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(-30),
        subscriptionStatus: null,
      }, NOW);
      expect(r?.urgency).toBe("expired");
      expect(r?.daysLeft).toBe(-30);
    });

    it("ISO string accepted", () => {
      const r = trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(5).toISOString(),
        subscriptionStatus: null,
      }, NOW);
      expect(r?.urgency).toBe("warning");
    });

    it("subscriptionStatus 'past_due' DOES NOT suppress banner — only 'active' does", () => {
      const r = trialBannerStatus({
        plan: "starter",
        trialEndsAt: daysFromNow(5),
        subscriptionStatus: "past_due",
      }, NOW);
      expect(r?.urgency).toBe("warning");
    });
  });
});
