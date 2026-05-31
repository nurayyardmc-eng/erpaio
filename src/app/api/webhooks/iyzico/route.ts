/**
 * iyzico webhook handler — Feature 7.4.
 *
 * Receives subscription lifecycle events from iyzico merchant panel.
 * Signature verification: iyzico signs the raw body with the webhook
 * secret (configured panel-side); we recompute HMAC-SHA256 and
 * constant-time-compare against the X-Iyz-Signature header.
 *
 * Event handlers mirror src/app/api/webhooks/stripe/route.ts shape:
 *   subscription.activation → mark active, send activated email
 *   subscription.renewal    → log + send renewal email
 *   subscription.unpaid     → downgrade-warning email
 *   subscription.cancellation → downgrade to starter + cancellation email
 *   subscription.trial.expire → log trial end
 *
 * Idempotency: iyzico can replay events. We use the `iyziReferenceCode`
 * (unique per event) as the dedup key via the ProcessedWebhook table,
 * mirroring the Stripe pattern.
 */
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { transactionalEmailHtml } from "@/lib/notifications/emailLayout";
import { childLogger } from "@/lib/observability/logger";
import { baseUrl } from "@/lib/url";
import {
  verifyIyzicoWebhookSignature,
  isIyzicoConfigured,
  getSubscription,
  mapIyzicoStatusToInternal,
  inferPlanFromIyzicoReference,
  classifyIyzicoEvent,
  reconcileActivationCandidate,
  type IyzicoWebhookEvent,
} from "@/lib/billing/iyzico";
import {
  iyzicoSubscriptionActivatedEmail,
  iyzicoSubscriptionRenewalEmail,
  iyzicoSubscriptionUnpaidEmail,
  iyzicoSubscriptionCancelledEmail,
  iyzicoTrialExpiringEmail,
} from "@/lib/billing/iyzicoEmails";

const log = childLogger({ component: "iyzico-webhook" });

export const runtime = "nodejs";
export const maxDuration = 30;

const webhookSecret = process.env.IYZICO_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!isIyzicoConfigured() || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("x-iyz-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  if (!verifyIyzicoWebhookSignature(rawBody, signature, webhookSecret)) {
    log.warn({ sig: signature.slice(0, 12) }, "Invalid webhook signature");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: IyzicoWebhookEvent;
  try {
    event = JSON.parse(rawBody) as IyzicoWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Sprint A.2 — race-safe idempotency.
  //
  // Earlier code did findUnique → process → create. Between the read and the
  // create, a concurrent replay could pass the read check and both runs would
  // process the same event (duplicate side-effects, double subscription
  // updates, double notification emails).
  //
  // Correct order: INSERT FIRST. The unique constraint on ProcessedWebhook.id
  // is the only race-safe primitive; either we create the row (single winner)
  // or we get P2002 (replay, bail). If the handler then fails, we delete the
  // marker so the next retry can re-process.
  const dedupId = event.iyziReferenceCode ? `iyzico:${event.iyziReferenceCode}` : null;
  if (dedupId) {
    try {
      await prisma.processedWebhook.create({
        data: {
          id: dedupId,
          provider: "iyzico",
          eventType: event.iyziEventType,
        },
      });
    } catch (err) {
      // P2002 unique-constraint violation → another worker already claimed this
      // event. Treat as a benign replay.
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        log.info({ eventId: event.iyziReferenceCode }, "Webhook replay — skipped");
        return Response.json({ ok: true, replay: true });
      }
      // Unexpected DB error — log and bail; iyzico will retry.
      log.error({ err }, "iyzico idempotency claim failed");
      Sentry.captureException(err, { tags: { component: "iyzico-webhook" } });
      return Response.json({ error: "Idempotency claim failed." }, { status: 500 });
    }
  }

  try {
    await processIyzicoEvent(event);
  } catch (err) {
    log.error({ err, eventType: event.iyziEventType }, "iyzico webhook processing failed");
    Sentry.captureException(err, { tags: { component: "iyzico-webhook" }, extra: { event } });
    // Release the idempotency claim so the next iyzico retry can re-process.
    if (dedupId) {
      await prisma.processedWebhook
        .delete({ where: { id: dedupId } })
        .catch((delErr) => log.warn({ delErr }, "Failed to release idempotency claim"));
    }
    return Response.json({ error: "Processing failed." }, { status: 500 });
  }

  return Response.json({ ok: true });
}

async function processIyzicoEvent(event: IyzicoWebhookEvent): Promise<void> {
  const subRef = event.iyziSubscriptionReferenceCode;
  const custRef = event.iyziCustomerReferenceCode;
  if (!subRef && !custRef) {
    log.warn({ eventType: event.iyziEventType }, "iyzico event lacks subscription/customer ref");
    return;
  }

  // Look up tenant by either subscriptionId or customerId.
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        ...(subRef ? [{ iyzicoSubscriptionId: subRef }] : []),
        ...(custRef ? [{ iyzicoCustomerId: custRef }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      defaultLocale: true,
      users: { where: { role: "owner" }, select: { email: true }, take: 1 },
    },
  });

  // Feature 9.0 — first-time activation reconciliation.
  // The tenant has paymentProvider="iyzico" set (by /api/billing/checkout)
  // but iyzicoSubscriptionId is still null because iyzico generates that
  // only after the user actually pays. So the activation webhook arrives
  // for an "unknown" tenant. We reconcile by finding the unique tenant
  // that recently kicked off an iyzico checkout (paymentProvider="iyzico"
  // AND iyzicoSubscriptionId IS NULL) and claim it. If multiple tenants
  // are in this state simultaneously we refuse to guess — admin must
  // resolve manually.
  if (!tenant && subRef && event.iyziEventType === "subscription.activation") {
    // Tenant has no updatedAt — paymentProvider="iyzico" + iyzicoSubscriptionId=null
    // is a transient state lasting from checkout init until this webhook arrives
    // (usually < 60s). Concurrent upgrades are rare at pilot scale, but we
    // refuse to guess when ambiguity exists.
    const candidates = await prisma.tenant.findMany({
      where: {
        paymentProvider: "iyzico",
        iyzicoSubscriptionId: null,
      },
      select: {
        id: true,
        name: true,
        defaultLocale: true,
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
      take: 2,
    });
    const decision = reconcileActivationCandidate(candidates);
    if (decision.decision === "claim") {
      tenant = candidates[0];
      log.info(
        { tenantId: decision.tenantId, subRef },
        "iyzico activation reconciled with pending-checkout tenant",
      );
    } else if (decision.decision === "ambiguous") {
      // Race condition — multiple tenants checked out concurrently.
      // Refuse to guess; sysadmin will trigger manual sync.
      const detail = await getSubscription(subRef).catch(() => null);
      log.warn(
        {
          subRef,
          customerRef: detail?.customerReferenceCode,
          candidateCount: decision.candidateCount,
        },
        "iyzico activation: multiple pending-checkout tenants — manual sync required",
      );
      return;
    } else {
      log.info({ subRef }, "iyzico activation for unknown tenant with no pending checkout");
      return;
    }
  }

  if (!tenant) return;

  const ownerEmail = tenant.users[0]?.email ?? null;
  const locale = tenant.defaultLocale;

  const action = classifyIyzicoEvent(event.iyziEventType);
  switch (action) {
    case "activation": {
      // Fetch full subscription to discover plan + status.
      const sub = subRef ? await getSubscription(subRef).catch(() => null) : null;
      const internalStatus = sub ? mapIyzicoStatusToInternal(sub.subscriptionStatus) : "active";
      // Map iyzico plan reference back to our internal plan name.
      const plan = inferPlanFromIyzicoReference(sub?.pricingPlanReferenceCode);
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan,
          subscriptionStatus: internalStatus,
          iyzicoSubscriptionId: subRef ?? null,
          iyzicoCustomerId: custRef ?? null,
          trialEndsAt: null,
          paymentProvider: "iyzico",
        },
      });
      if (ownerEmail) {
        const content = iyzicoSubscriptionActivatedEmail({
          plan,
          tenantName: tenant.name,
          dashboardUrl: `${baseUrl()}/dashboard`,
        }, locale);
        await sendEmail({
          to: ownerEmail,
          subject: content.subject,
          html: transactionalEmailHtml(content.heading, content.body, content.ctaText, content.ctaUrl),
          tenantId: tenant.id,
        }).catch((err) => log.error({ err }, "iyzico activation email failed"));
      }
      log.info({ tenantId: tenant.id, plan }, "iyzico subscription activated");
      break;
    }
    case "renewal": {
      const sub = subRef ? await getSubscription(subRef).catch(() => null) : null;
      const plan = inferPlanFromIyzicoReference(sub?.pricingPlanReferenceCode);
      if (ownerEmail) {
        const content = iyzicoSubscriptionRenewalEmail({
          plan,
          tenantName: tenant.name,
          dashboardUrl: `${baseUrl()}/dashboard`,
        }, locale);
        await sendEmail({
          to: ownerEmail,
          subject: content.subject,
          html: transactionalEmailHtml(content.heading, content.body, content.ctaText, content.ctaUrl),
          tenantId: tenant.id,
        }).catch((err) => log.error({ err }, "iyzico renewal email failed"));
      }
      log.info({ tenantId: tenant.id }, "iyzico subscription renewed");
      break;
    }
    case "unpaid": {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: "past_due" },
      });
      if (ownerEmail) {
        const content = iyzicoSubscriptionUnpaidEmail({
          tenantName: tenant.name,
          settingsUrl: `${baseUrl()}/dashboard/settings`,
        }, locale);
        await sendEmail({
          to: ownerEmail,
          subject: content.subject,
          html: transactionalEmailHtml(content.heading, content.body, content.ctaText, content.ctaUrl),
          tenantId: tenant.id,
        }).catch((err) => log.error({ err }, "iyzico unpaid email failed"));
      }
      log.warn({ tenantId: tenant.id }, "iyzico subscription unpaid");
      break;
    }
    case "cancellation": {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan: "starter",
          subscriptionStatus: "canceled",
          iyzicoSubscriptionId: null,
        },
      });
      if (ownerEmail) {
        const content = iyzicoSubscriptionCancelledEmail({
          tenantName: tenant.name,
          pricingUrl: `${baseUrl()}/pricing`,
        }, locale);
        await sendEmail({
          to: ownerEmail,
          subject: content.subject,
          html: transactionalEmailHtml(content.heading, content.body, content.ctaText, content.ctaUrl),
          tenantId: tenant.id,
        }).catch((err) => log.error({ err }, "iyzico cancellation email failed"));
      }
      log.info({ tenantId: tenant.id }, "iyzico subscription cancelled");
      break;
    }
    case "trial.expire": {
      if (ownerEmail) {
        const content = iyzicoTrialExpiringEmail({
          tenantName: tenant.name,
          pricingUrl: `${baseUrl()}/pricing`,
        }, locale);
        await sendEmail({
          to: ownerEmail,
          subject: content.subject,
          html: transactionalEmailHtml(content.heading, content.body, content.ctaText, content.ctaUrl),
          tenantId: tenant.id,
        }).catch((err) => log.error({ err }, "iyzico trial.expire email failed"));
      }
      log.info({ tenantId: tenant.id }, "iyzico trial expiring");
      break;
    }
    case "expire": {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { plan: "starter", subscriptionStatus: "expired" },
      });
      log.info({ tenantId: tenant.id }, "iyzico subscription expired");
      break;
    }
    case "unhandled":
      log.info({ eventType: event.iyziEventType }, "iyzico event unhandled");
      break;
  }
}
