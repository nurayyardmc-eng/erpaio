import * as Sentry from "@sentry/nextjs";
import { stripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/notifications/email";

export const runtime = "nodejs";

const log = childLogger({ component: "stripe-webhook" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";

async function findTenantByMetadataOrCustomer(
  metadata: { tenantId?: string } | undefined | null,
  customerId: string | null,
): Promise<{ id: string; name: string; ownerEmail: string | null } | null> {
  if (metadata?.tenantId) {
    const t = await prisma.tenant.findUnique({
      where: { id: metadata.tenantId },
      select: {
        id: true,
        name: true,
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
    });
    if (t) return { id: t.id, name: t.name, ownerEmail: t.users[0]?.email ?? null };
  }
  if (customerId) {
    const t = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
      select: {
        id: true,
        name: true,
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
    });
    if (t) return { id: t.id, name: t.name, ownerEmail: t.users[0]?.email ?? null };
  }
  return null;
}

function emailWrap(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
      <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">${title}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">${ctaLabel}</a>
    </div>
  </body></html>`;
}

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
            await sendEmail({
              to: tenant.ownerEmail,
              subject: `ERPAIO ${plan.toUpperCase()} planı aktif`,
              html: emailWrap(
                `${plan.toUpperCase()} planına hoş geldiniz`,
                `Ödemeniz başarıyla alındı. ${tenant.name} hesabınız artık ${plan} planında. Tüm Pro özellikler aktif: 2M aylık token, sınırsız watchlist, kapsamlı raporlama.`,
                "Dashboard'a Git →",
                `${baseUrl}/dashboard`,
              ),
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
          await sendEmail({
            to: tenant.ownerEmail,
            subject: "ERPAIO Pro denemenizin bitmesine 3 gün kaldı",
            html: emailWrap(
              "3 gün sonra ücretlendirme başlıyor",
              `${tenant.name} için Pro deneme süreniz 3 gün sonra bitecek ve kayıtlı kartınızdan ücret çekilecek. Vazgeçmek için 3 gün içinde Pricing sayfasından plan değişikliği yapabilirsiniz.`,
              "Planları İncele →",
              `${baseUrl}/pricing`,
            ),
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
            await sendEmail({
              to: tenant.ownerEmail,
              subject: "ERPAIO aboneliğiniz iptal edildi",
              html: emailWrap(
                "Aboneliğiniz iptal edildi",
                `${tenant.name} aboneliğiniz iptal edildi. Hesabınız Starter plana düştü, verileriniz korunuyor. Yeniden başlatmak için pricing sayfasını ziyaret edin.`,
                "Pro'ya Dön →",
                `${baseUrl}/pricing`,
              ),
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
          await sendEmail({
            to: tenant.ownerEmail,
            subject: "ERPAIO — Ödemeniz başarısız oldu",
            html: emailWrap(
              "Kart ödemesi alınamadı",
              `${tenant.name} için son ödeme denemesi başarısız oldu. Kart bilgilerinizi güncellemek ya da yeni kart eklemek için billing sayfanızı ziyaret edin. 7 gün içinde çözülmezse hesabınız Starter plana düşer.`,
              "Faturayı Görüntüle →",
              invoice.hosted_invoice_url ?? `${baseUrl}/dashboard/settings`,
            ),
            tenantId: tenant.id,
          }).catch((emailErr) => {
            log.error({ err: emailErr, tenantId: tenant.id }, "Stripe webhook email send failed");
            Sentry.captureException(emailErr, { tags: { component: "stripe-webhook", subsystem: "email" } });
          });
        }
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
