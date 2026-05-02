import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, PRICE_IDS, isStripeConfigured } from "@/lib/billing/stripe";

const BodySchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
});

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return Response.json(
      { error: "Stripe not configured. Contact support@erpaio.com to upgrade." },
      { status: 503 },
    );
  }

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca tenant sahibi plan değiştirebilir." }, { status: 403 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: "Geçersiz plan." }, { status: 400 });

  const { plan } = body.data;
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return Response.json({ error: `${plan} fiyat ID'si yapılandırılmamış.` }, { status: 503 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!tenant) return Response.json({ error: "Tenant bulunamadı." }, { status: 404 });

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
    success_url: `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/dashboard/settings?upgrade=success`,
    cancel_url: `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/pricing?upgrade=cancelled`,
    metadata: { tenantId: tenant.id, plan },
    subscription_data: { metadata: { tenantId: tenant.id, plan } },
  });

  return Response.json({ url: checkout.url });
}
