import * as Sentry from "@sentry/nextjs";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/notifications/email";
import { transactionalEmailHtml } from "@/lib/notifications/emailLayout";
import {
  subscriptionActivatedEmail,
  trialWillEndEmail,
  subscriptionCancelledEmail,
  paymentFailedEmail,
} from "@/lib/billing/stripeEmails";

export const runtime = "nodejs";

const log = childLogger({ component: "stripe-webhook" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";

async function findTenantByMetadataOrCustomer(
  metadata: { tenantId?: string } | undefined | null,
  customerId: string | null,
): Promise<{ id: string; name: string; ownerEmail: string | null; defaultLocale: string } | null> {
  if (metadata?.tenantId) {
    const t = await prisma.tenant.findUnique({
      where: { id: metadata.tenantId },
      select: {
        id: true,
        name: true,
        defaultLocale: true,
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
    });
    if (t) return { id: t.id, name: t.name, ownerEmail: t.users[0]?.email ?? null, defaultLocale: t.defaultLocale };
  }
  if (customerId) {
    const t = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
      select: {
        id: true,
        name: true,
        defaultLocale: true,
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
    });
    if (t) return { id: t.id, name: t.name, ownerEmail: t.users[0]?.email ?? null, defaultLocale: t.defaultLocale };
  }
  return null;
}

// Email template extracted (Track EEEEE) → @/lib/notifications/emailLayout
const emailWrap = transactionalEmailHtml;

export async function POST(req: Request) {
  if (!isStripeConfigured() || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    // Stripe replay tolerance — explicit 300s (default zaten 300s, ama SDK
    // versiyonu değişince surprise olmasın). Saatler senkron değilse fail eder.
    event = stripe!.webhooks.constructEvent(body, signature, webhookSecret, 300);
  } catch (err) {
    log.warn({ err }, "Invalid webhook signature");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency guard — Stripe retries failed deliveries. Without this we'd
  // re-run the handler body (re-send welcome emails, re-fire side effects).
  // Insert-first semantics: at-most-once side effects. If handler crashes
  // mid-flight, Stripe's retry will see the duplicate and skip. To force a
  // replay (rare ops scenario), sysadmin deletes the ProcessedWebhook row.
  try {
    await prisma.processedWebhook.create({
      data: { id: event.id, provider: "stripe", eventType: event.type },
    });
  } catch {
    // Unique constraint violation → already processed. Acknowledge to Stripe.
    log.info({ eventId: event.id, type: event.type }, "Duplicate webhook — skipped");
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object;
        const customerId = typeof cs.customer === "string" ? cs.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(cs.metadata, customerId);
        const plan = cs.metadata?.plan;
        if (tenant && plan) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              plan,
              subscriptionStatus: "active",
              stripeCustomerId: customerId,
              stripeSubscriptionId: typeof cs.subscription === "string" ? cs.subscription : null,
              trialEndsAt: null,
            },
          });
          log.info({ tenantId: tenant.id, plan }, "Subscription activated");

          if (tenant.ownerEmail) {
            // Feature 6.1 — tenant.defaultLocale flows from schema → email locale.
            const content = subscriptionActivatedEmail({
              plan,
              tenantName: tenant.name,
              dashboardUrl: `${baseUrl}/dashboard`,
            }, tenant.defaultLocale);
            await sendEmail({
              to: tenant.ownerEmail,
              subject: content.subject,
              html: emailWrap(content.heading, content.body, content.ctaText, content.ctaUrl),
              tenantId: tenant.id,
            }).catch((emailErr) => {
              log.error({ err: emailErr, tenantId: tenant.id }, "Stripe webhook email send failed");
              Sentry.captureException(emailErr, { tags: { component: "stripe-webhook", subsystem: "email" } });
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(sub.metadata, customerId);
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              subscriptionStatus: sub.status,
              stripeSubscriptionId: sub.id,
              stripeCustomerId: customerId,
            },
          });
          log.info({ tenantId: tenant.id, status: sub.status }, "Subscription status updated");
        }
        break;
      }
      case "customer.subscription.trial_will_end": {
        // Stripe trial bitmeye 3 gün kala bu event'i gönderir
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(sub.metadata, customerId);
        if (tenant?.ownerEmail) {
          const content = trialWillEndEmail({
            tenantName: tenant.name,
            pricingUrl: `${baseUrl}/pricing`,
          }, tenant.defaultLocale);
          await sendEmail({
            to: tenant.ownerEmail,
            subject: content.subject,
            html: emailWrap(content.heading, content.body, content.ctaText, content.ctaUrl),
            tenantId: tenant.id,
          }).catch((emailErr) => {
            log.error({ err: emailErr, tenantId: tenant.id }, "Stripe webhook email send failed");
            Sentry.captureException(emailErr, { tags: { component: "stripe-webhook", subsystem: "email" } });
          });
          log.info({ tenantId: tenant.id }, "trial_will_end notification sent");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(sub.metadata, customerId);
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: "starter", subscriptionStatus: "cancelled" },
          });
          log.info({ tenantId: tenant.id }, "Subscription cancelled — downgraded to starter");

          if (tenant.ownerEmail) {
            const content = subscriptionCancelledEmail({
              tenantName: tenant.name,
              pricingUrl: `${baseUrl}/pricing`,
            }, tenant.defaultLocale);
            await sendEmail({
              to: tenant.ownerEmail,
              subject: content.subject,
              html: emailWrap(content.heading, content.body, content.ctaText, content.ctaUrl),
              tenantId: tenant.id,
            }).catch((emailErr) => {
              log.error({ err: emailErr, tenantId: tenant.id }, "Stripe webhook email send failed");
              Sentry.captureException(emailErr, { tags: { component: "stripe-webhook", subsystem: "email" } });
            });
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        log.info(
          { customerId, amount: invoice.amount_paid, currency: invoice.currency },
          "Payment succeeded",
        );
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(undefined, customerId);
        log.warn({ customerId, tenantId: tenant?.id }, "Payment failed");

        if (tenant?.ownerEmail) {
          const content = paymentFailedEmail({
            tenantName: tenant.name,
            invoiceUrl: invoice.hosted_invoice_url ?? `${baseUrl}/dashboard/settings`,
          }, tenant.defaultLocale);
          await sendEmail({
            to: tenant.ownerEmail,
            subject: content.subject,
            html: emailWrap(content.heading, content.body, content.ctaText, content.ctaUrl),
            tenantId: tenant.id,
          }).catch((emailErr) => {
            log.error({ err: emailErr, tenantId: tenant.id }, "Stripe webhook email send failed");
            Sentry.captureException(emailErr, { tags: { component: "stripe-webhook", subsystem: "email" } });
          });
        }
        break;
      }
      case "customer.subscription.paused": {
        // Stripe: subscription paused by user/admin (no billing, no service).
        // Tenant plan'ı starter'a düşür, audit ekle. Resume için
        // subscription.resumed event'ini handle ediyoruz (aşağıda).
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(sub.metadata, customerId);
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: "paused" },
          });
          log.info({ tenantId: tenant.id }, "Subscription paused");
        }
        break;
      }
      case "customer.subscription.resumed": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tenant = await findTenantByMetadataOrCustomer(sub.metadata, customerId);
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: sub.status },
          });
          log.info({ tenantId: tenant.id, status: sub.status }, "Subscription resumed");
        }
        break;
      }
      case "customer.deleted": {
        // Stripe customer silindi — tenant.stripeCustomerId temizle ki
        // gelecek aboneliklerde stale referans olmasın. Tenant'ı silmiyoruz
        // (KVKK silinme talebi için /api/tenant/delete ayrı bir flow).
        const customer = event.data.object;
        const customerId = typeof customer.id === "string" ? customer.id : null;
        if (customerId) {
          const result = await prisma.tenant.updateMany({
            where: { stripeCustomerId: customerId },
            data: { stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: "cancelled" },
          });
          log.info({ customerId, tenantsUpdated: result.count }, "Stripe customer deleted — cleared tenant refs");
        }
        break;
      }
      case "invoice.paid": {
        // invoice.payment_succeeded zaten log'lanıyor. Bu event ek "paid"
        // signal'i (manuel ödeme dahil); zenginleştirme için ayrı log.
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        log.info(
          { customerId, amount: invoice.amount_paid, currency: invoice.currency, invoiceId: invoice.id },
          "Invoice paid",
        );
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
