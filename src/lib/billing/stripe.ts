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
