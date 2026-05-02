import * as Sentry from "@sentry/nextjs";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";

const log = childLogger({ component: "stripe-webhook" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!isStripeConfigured() || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = stripe!.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.warn({ err }, "Invalid webhook signature");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object;
        const tenantId = cs.metadata?.tenantId;
        const plan = cs.metadata?.plan;
        if (tenantId && plan) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan,
              subscriptionStatus: "active",
              stripeSubscriptionId: typeof cs.subscription === "string" ? cs.subscription : null,
              trialEndsAt: null,
            },
          });
          log.info({ tenantId, plan }, "Subscription activated");
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              subscriptionStatus: sub.status,
              stripeSubscriptionId: sub.id,
            },
          });
          log.info({ tenantId, status: sub.status }, "Subscription status updated");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { plan: "starter", subscriptionStatus: "cancelled" },
          });
          log.info({ tenantId }, "Subscription cancelled — downgraded to starter");
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        log.warn({ customerId: invoice.customer }, "Payment failed");
        break;
      }
      default:
        log.debug({ type: event.type }, "Unhandled event");
    }
  } catch (err) {
    log.error({ err, type: event.type }, "Webhook handler error");
    Sentry.captureException(err, { tags: { component: "stripe-webhook", event: event.type } });
    return Response.json({ error: "Handler error." }, { status: 500 });
  }

  return Response.json({ received: true });
}
