import { describe, it, expect } from "vitest";
import { isStripeConfigured, stripe, PRICE_IDS } from "./stripe";

describe("billing/stripe", () => {
  describe("isStripeConfigured", () => {
    it("returns boolean", () => {
      expect(typeof isStripeConfigured()).toBe("boolean");
    });

    it("matches stripe instance presence", () => {
      // stripe === null iff STRIPE_SECRET_KEY missing
      if (process.env.STRIPE_SECRET_KEY) {
        expect(isStripeConfigured()).toBe(true);
        expect(stripe).not.toBeNull();
      } else {
        expect(isStripeConfigured()).toBe(false);
        expect(stripe).toBeNull();
      }
    });
  });

  describe("PRICE_IDS", () => {
    it("has pro + enterprise keys", () => {
      expect("pro" in PRICE_IDS).toBe(true);
      expect("enterprise" in PRICE_IDS).toBe(true);
    });

    it("values are string|undefined (env-sourced)", () => {
      for (const v of Object.values(PRICE_IDS)) {
        expect(v === undefined || typeof v === "string").toBe(true);
      }
    });

    it("values match env vars", () => {
      expect(PRICE_IDS.pro).toBe(process.env.STRIPE_PRICE_PRO);
      expect(PRICE_IDS.enterprise).toBe(process.env.STRIPE_PRICE_ENTERPRISE);
    });
  });
});
