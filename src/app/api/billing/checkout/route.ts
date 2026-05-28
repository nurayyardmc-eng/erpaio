import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, PRICE_IDS, isStripeConfigured } from "@/lib/billing/stripe";
import {
  IYZICO_PRICE_IDS,
  initSubscriptionCheckout,
  isIyzicoConfigured,
  isPaymentProviderConfigured,
  pickPaymentProvider,
} from "@/lib/billing/iyzico";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody, tenantNotFoundError } from "@/lib/http/searchParams";
import { requireOwner } from "@/lib/auth/role";
import { baseUrl } from "@/lib/url";

const BodySchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
  /**
   * For iyzico checkout the caller must provide identity + billing address
   * (TR market compliance — fatura kesimi için zorunlu). Stripe ignores
   * these fields. UI may collect them in a separate iyzico-specific form
   * step before POSTing here.
   */
  iyzico: z
    .object({
      name: z.string().min(1).max(80),
      surname: z.string().min(1).max(80),
      identityNumber: z.string().regex(/^\d{11}$/).optional(),
      gsmNumber: z.string().regex(/^\+?\d{10,15}$/).optional(),
      city: z.string().min(1).max(60),
      country: z.string().min(2).max(3).default("Turkey"),
      address: z.string().min(5).max(200),
      zipCode: z.string().max(10).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  if (!isPaymentProviderConfigured()) {
    return localizedError(req, 503, {
      tr: "Ödeme sağlayıcı yapılandırılmamış. Yükseltme için support@erpaio.com ile iletişime geçin.",
      en: "No payment provider configured. Contact support@erpaio.com to upgrade.",
    });
  }

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwner(req, session.user.role, {
    tr: "Yalnızca tenant sahibi plan değiştirebilir.",
    en: "Only the tenant owner can change the plan.",
  });
  if (denied) return denied;

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { plan } = body;

  // Provider-aware dispatch. iyzico priority when env present (TR market).
  const provider = pickPaymentProvider();

  // -----------------------------------------------------------------
  // iyzico path
  // -----------------------------------------------------------------
  if (provider === "iyzico" && isIyzicoConfigured()) {
    if (!body.iyzico) {
      return localizedError(req, 400, {
        tr: "iyzico ödemesi için isim, soyisim, şehir, adres bilgileri zorunludur (fatura kesimi için).",
        en: "iyzico requires name, surname, city, address details (required for invoice).",
      });
    }
    const planRef = IYZICO_PRICE_IDS[plan];
    if (!planRef) {
      return localizedError(req, 503, {
        tr: `${plan} için iyzico pricing plan reference code yapılandırılmamış.`,
        en: `iyzico pricing plan reference code not configured for ${plan}.`,
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { id: true, name: true, defaultLocale: true },
    });
    if (!tenant) return tenantNotFoundError(req);

    try {
      const result = await initSubscriptionCheckout({
        locale: tenant.defaultLocale === "en" ? "en" : "tr",
        conversationId: tenant.id, // tenantId stable across retries
        pricingPlanReferenceCode: planRef,
        subscriptionInitialStatus: "ACTIVE",
        callbackUrl: `${baseUrl()}/dashboard/settings?upgrade=success&provider=iyzico`,
        customer: {
          email: session.user.email ?? "",
          name: body.iyzico.name,
          surname: body.iyzico.surname,
          identityNumber: body.iyzico.identityNumber,
          gsmNumber: body.iyzico.gsmNumber,
          billingAddress: {
            contactName: `${body.iyzico.name} ${body.iyzico.surname}`,
            city: body.iyzico.city,
            country: body.iyzico.country,
            address: body.iyzico.address,
            zipCode: body.iyzico.zipCode,
          },
        },
      });

      if (result.status !== "success" || !result.checkoutFormContent) {
        return localizedError(req, 502, {
          tr: result.errorMessage ?? "iyzico checkout başlatılamadı.",
          en: result.errorMessage ?? "iyzico checkout could not be initialized.",
        });
      }
      // Mark provider on tenant so webhook can disambiguate.
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { paymentProvider: "iyzico" },
      });
      return Response.json({ url: result.checkoutFormContent, token: result.token });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return localizedError(req, 502, {
        tr: `iyzico checkout hatası: ${msg}`,
        en: `iyzico checkout error: ${msg}`,
      });
    }
  }

  // -----------------------------------------------------------------
  // Stripe path (default fallback when iyzico not configured)
  // -----------------------------------------------------------------
  if (!isStripeConfigured()) {
    return localizedError(req, 503, {
      tr: "Stripe yapılandırılmamış. Yükseltme için support@erpaio.com ile iletişime geçin.",
      en: "Stripe not configured. Contact support@erpaio.com to upgrade.",
    });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return localizedError(req, 503, { tr: `${plan} fiyat ID'si yapılandırılmamış.`, en: `${plan} price ID not configured.` });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!tenant) return tenantNotFoundError(req);

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
      data: { stripeCustomerId: customerId, paymentProvider: "stripe" },
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
