/**
 * GET /api/billing/provider — expose active payment provider + tenant
 * subscription state to the dashboard. Used by the upgrade/manage UI in
 * settings page to decide whether to show iyzico form vs Stripe redirect.
 */
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { isStripeConfigured } from "@/lib/billing/stripe";
import {
  isIyzicoConfigured,
  pickPaymentProvider,
  type PaymentProvider,
} from "@/lib/billing/iyzico";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      plan: true,
      subscriptionStatus: true,
      paymentProvider: true,
      stripeCustomerId: true,
      iyzicoSubscriptionId: true,
      trialEndsAt: true,
    },
  });

  if (!tenant) return jsonError(req, "api.notFound", 404);

  // Provider for new upgrades = pickPaymentProvider().
  // Provider for managing existing sub = tenant.paymentProvider (already set).
  const upgradeProvider: PaymentProvider = pickPaymentProvider();
  const hasActiveSubscription =
    tenant.plan !== "starter" &&
    (tenant.subscriptionStatus === "active" ||
      tenant.subscriptionStatus === "trialing");

  return Response.json({
    plan: tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus,
    paymentProvider: tenant.paymentProvider,
    upgradeProvider,
    hasActiveSubscription,
    trialEndsAt: tenant.trialEndsAt,
    providerConfigured: {
      stripe: isStripeConfigured(),
      iyzico: isIyzicoConfigured(),
    },
  });
}
