import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";
import { cancelSubscription, isIyzicoConfigured } from "@/lib/billing/iyzico";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwner } from "@/lib/auth/role";
import { baseUrl } from "@/lib/url";

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwner(req, session.user.role);
  if (denied) return denied;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      stripeCustomerId: true,
      iyzicoSubscriptionId: true,
      paymentProvider: true,
    },
  });

  if (!tenant) {
    return jsonError(req, "api.notFound", 404);
  }

  // Provider-aware dispatch.
  // -----------------------------------------------------------------
  // iyzico path — no hosted portal, so this endpoint = cancellation
  // -----------------------------------------------------------------
  if (tenant.paymentProvider === "iyzico" && tenant.iyzicoSubscriptionId) {
    if (!isIyzicoConfigured()) {
      return localizedError(req, 503, {
        tr: "iyzico yapılandırılmamış. Plan yönetimi için support@erpaio.com.",
        en: "iyzico not configured. Contact support@erpaio.com to manage your plan.",
      });
    }
    try {
      const result = await cancelSubscription(tenant.iyzicoSubscriptionId);
      if (result.status !== "success") {
        return localizedError(req, 502, {
          tr: result.errorMessage ?? "iyzico aboneliği iptal edilemedi.",
          en: result.errorMessage ?? "iyzico subscription could not be cancelled.",
        });
      }
      // Webhook will follow with subscription.cancellation event;
      // the actual tenant state update happens there.
      return Response.json({
        ok: true,
        provider: "iyzico",
        action: "cancellation_requested",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return localizedError(req, 502, {
        tr: `iyzico iptal hatası: ${msg}`,
        en: `iyzico cancel error: ${msg}`,
      });
    }
  }

  // -----------------------------------------------------------------
  // Stripe path (hosted billing portal)
  // -----------------------------------------------------------------
  if (!isStripeConfigured()) {
    return localizedError(req, 503, { tr: "Stripe yapılandırılmamış.", en: "Stripe not configured." });
  }

  if (!tenant.stripeCustomerId) {
    return localizedError(req, 400, { tr: "Henüz aktif aboneliğiniz yok.", en: "You don't have an active subscription yet." });
  }

  const portal = await stripe!.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${baseUrl()}/dashboard/settings`,
  });

  return Response.json({ url: portal.url, provider: "stripe" });
}
