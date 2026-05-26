import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { isOwner } from "@/lib/auth/role";
import { baseUrl } from "@/lib/url";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return localizedError(req, 503, { tr: "Stripe yapılandırılmamış.", en: "Stripe not configured." });
  }

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (!isOwner(session.user.role)) {
    return localizedError(req, 403, { tr: "Yalnızca tenant sahibi.", en: "Only the tenant owner." });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { stripeCustomerId: true },
  });
  if (!tenant?.stripeCustomerId) {
    return localizedError(req, 400, { tr: "Henüz aktif aboneliğiniz yok.", en: "You don't have an active subscription yet." });
  }

  const portal = await stripe!.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${baseUrl()}/dashboard/settings`,
  });

  return Response.json({ url: portal.url });
}
