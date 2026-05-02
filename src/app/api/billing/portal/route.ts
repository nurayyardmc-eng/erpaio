import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca tenant sahibi." }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { stripeCustomerId: true },
  });
  if (!tenant?.stripeCustomerId) {
    return Response.json({ error: "Henüz aktif aboneliğiniz yok." }, { status: 400 });
  }

  const portal = await stripe!.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/dashboard/settings`,
  });

  return Response.json({ url: portal.url });
}
