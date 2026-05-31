import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
export const stripe = apiKey ? new Stripe(apiKey, { apiVersion: "2026-04-22.dahlia" }) : null;

export const PRICE_IDS: Record<"pro" | "enterprise", string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

/**
 * Stripe webhook event type → internal action union.
 * Mirrors classifyIyzicoEvent so both billing providers share the same
 * dispatcher vocabulary at call sites. Pure & testable: no DB / Stripe SDK.
 *
 * Action meanings:
 *  - activate         → checkout.session.completed (first paid sub)
 *  - update           → subscription created/updated (status change)
 *  - trial-ending     → 3 gün kala uyarı
 *  - cancel           → subscription deleted
 *  - pause / resume   → user/admin pause + resume
 *  - payment-succeeded / payment-failed / invoice-paid → invoice events
 *  - customer-deleted → cleanup tenant.stripeCustomerId references
 *  - unhandled        → log + ack (Stripe re-tries on 5xx, not on 200)
 */
export type StripeEventAction =
  | "activate"
  | "update"
  | "trial-ending"
  | "cancel"
  | "pause"
  | "resume"
  | "payment-succeeded"
  | "payment-failed"
  | "invoice-paid"
  | "customer-deleted"
  | "unhandled";

export function classifyStripeEvent(eventType: string): StripeEventAction {
  switch (eventType) {
    case "checkout.session.completed":
      return "activate";
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return "update";
    case "customer.subscription.trial_will_end":
      return "trial-ending";
    case "customer.subscription.deleted":
      return "cancel";
    case "customer.subscription.paused":
      return "pause";
    case "customer.subscription.resumed":
      return "resume";
    case "invoice.payment_succeeded":
      return "payment-succeeded";
    case "invoice.payment_failed":
      return "payment-failed";
    case "invoice.paid":
      return "invoice-paid";
    case "customer.deleted":
      return "customer-deleted";
    default:
      return "unhandled";
  }
}
