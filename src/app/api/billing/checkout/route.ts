import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, PRICE_IDS, isStripeConfigured } from "@/lib/billing/stripe";
import { isPaymentProviderConfigured, pickPaymentProvider } from "@/lib/billing/iyzico";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { requireOwner } from "@/lib/auth/role";
import { baseUrl } from "@/lib/url";

const BodySchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
});

export async function POST(req: Request) {
  // Track JJJJJJJ: provider gate Stripe → fallback iyzico (TR) → manual.
  if (!isPaymentProviderConfigured()) {
    return localizedError(req, 503, {
      tr: "Ödeme sağlayıcı yapılandırılmamış. Yükseltme için support@erpaio.com ile iletişime geçin.",
      en: "No payment provider configured. Contact support@erpaio.com to upgrade.",
    });
  }
  // iyzico TR-priority. Currently iyzico stubbed → fall through to Stripe.
  // Future: separate /api/billing/iyzico/checkout route.
  if (pickPaymentProvider() === "iyzico" && !isStripeConfigured()) {
    return localizedError(req, 501, {
      tr: "iyzico checkout henüz hazır değil. support@erpaio.com ile iletişime geçin.",
      en: "iyzico checkout not yet implemented. Contact support@erpaio.com.",
    });
  }
  if (!isStripeConfigured()) {
    return localizedError(req, 503, {
      tr: "Stripe yapılandırılmamış. Yükseltme için support@erpaio.com ile iletişime geçin.",
      en: "Stripe not configured. Contact support@erpaio.com to upgrade.",
    });
  }

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwner(req, session.user.role, {
    tr: "Yalnızca tenant sahibi plan değiştirebilir.",
    en: "Only the tenant owner can change the plan.",
  });
  if (denied) return denied;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: "Geçersiz plan.", en: "Invalid plan." });

  const { plan } = body.data;
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return localizedError(req, 503, { tr: `${plan} fiyat ID'si yapılandırılmamış.`, en: `${plan} price ID not configured.` });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!tenant) return localizedError(req, 404, { tr: "Tenant bulunamadı.", en: "Tenant not found." });

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe!.customers.create({
      email: session.user.email ?? undefined,
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe!.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl()}/dashboard/settings?upgrade=success`,
    cancel_url: `${baseUrl()}/pricing?upgrade=cancelled`,
    metadata: { tenantId: tenant.id, plan },
    subscription_data: { metadata: { tenantId: tenant.id, plan } },
  });

  return Response.json({ url: checkout.url });
}
