import { describe, it, expect } from "vitest";
import { isStripeConfigured, stripe, PRICE_IDS, classifyStripeEvent } from "./stripe";

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

  describe("classifyStripeEvent", () => {
    it("checkout.session.completed → activate", () => {
      expect(classifyStripeEvent("checkout.session.completed")).toBe("activate");
    });

    it("subscription created/updated → update", () => {
      expect(classifyStripeEvent("customer.subscription.created")).toBe("update");
      expect(classifyStripeEvent("customer.subscription.updated")).toBe("update");
    });

    it("trial_will_end → trial-ending", () => {
      expect(classifyStripeEvent("customer.subscription.trial_will_end")).toBe("trial-ending");
    });

    it("subscription deleted → cancel", () => {
      expect(classifyStripeEvent("customer.subscription.deleted")).toBe("cancel");
    });

    it("subscription paused/resumed → pause / resume", () => {
      expect(classifyStripeEvent("customer.subscription.paused")).toBe("pause");
      expect(classifyStripeEvent("customer.subscription.resumed")).toBe("resume");
    });

    it("invoice events split correctly", () => {
      expect(classifyStripeEvent("invoice.payment_succeeded")).toBe("payment-succeeded");
      expect(classifyStripeEvent("invoice.payment_failed")).toBe("payment-failed");
      expect(classifyStripeEvent("invoice.paid")).toBe("invoice-paid");
    });

    it("customer.deleted → customer-deleted", () => {
      expect(classifyStripeEvent("customer.deleted")).toBe("customer-deleted");
    });

    it("unknown event type → unhandled", () => {
      expect(classifyStripeEvent("payout.created")).toBe("unhandled");
      expect(classifyStripeEvent("totally_made_up.event")).toBe("unhandled");
      expect(classifyStripeEvent("")).toBe("unhandled");
    });

    it("case-sensitive: uppercased variant → unhandled", () => {
      expect(classifyStripeEvent("CHECKOUT.SESSION.COMPLETED")).toBe("unhandled");
    });

    it("trailing whitespace variant → unhandled (no trim)", () => {
      expect(classifyStripeEvent("invoice.paid ")).toBe("unhandled");
    });
  });
});
