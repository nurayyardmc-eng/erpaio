/**
 * Stripe transactional email content (TR + EN).
 *
 * Feature 5.2 — extracted from src/app/api/webhooks/stripe/route.ts so
 * subject + body + cta copy can be unit-tested and properly localized.
 * Webhook route composes the final HTML via transactionalEmailHtml().
 *
 * Locale defaults to "tr" until Tenant.locale schema field exists.
 * When that lands, callers pass tenant.locale here.
 */

export interface StripeEmailContent {
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

type Locale = "tr" | "en" | string;

function isEn(locale: Locale): boolean {
  return locale === "en";
}

/** Subscription activated (checkout.session.completed). */
export function subscriptionActivatedEmail(
  params: { plan: string; tenantName: string; dashboardUrl: string },
  locale: Locale = "tr",
): StripeEmailContent {
  const planUpper = params.plan.toUpperCase();
  if (isEn(locale)) {
    return {
      subject: `ERPAIO ${planUpper} plan active`,
      heading: `Welcome to ${planUpper}`,
      body: `Your payment was received. ${params.tenantName} is now on the ${params.plan} plan. All Pro features are active: 2M monthly tokens, unlimited watchlists, full reporting.`,
      ctaText: "Go to Dashboard →",
      ctaUrl: params.dashboardUrl,
    };
  }
  return {
    subject: `ERPAIO ${planUpper} planı aktif`,
    heading: `${planUpper} planına hoş geldiniz`,
    body: `Ödemeniz başarıyla alındı. ${params.tenantName} hesabınız artık ${params.plan} planında. Tüm Pro özellikler aktif: 2M aylık token, sınırsız watchlist, kapsamlı raporlama.`,
    ctaText: "Dashboard'a Git →",
    ctaUrl: params.dashboardUrl,
  };
}

/** Trial will end in 3 days (customer.subscription.trial_will_end). */
export function trialWillEndEmail(
  params: { tenantName: string; pricingUrl: string },
  locale: Locale = "tr",
): StripeEmailContent {
  if (isEn(locale)) {
    return {
      subject: "Your ERPAIO Pro trial ends in 3 days",
      heading: "Billing starts in 3 days",
      body: `Your Pro trial for ${params.tenantName} ends in 3 days, after which your saved card will be charged. To opt out, change your plan within 3 days from the Pricing page.`,
      ctaText: "View Plans →",
      ctaUrl: params.pricingUrl,
    };
  }
  return {
    subject: "ERPAIO Pro denemenizin bitmesine 3 gün kaldı",
    heading: "3 gün sonra ücretlendirme başlıyor",
    body: `${params.tenantName} için Pro deneme süreniz 3 gün sonra bitecek ve kayıtlı kartınızdan ücret çekilecek. Vazgeçmek için 3 gün içinde Pricing sayfasından plan değişikliği yapabilirsiniz.`,
    ctaText: "Planları İncele →",
    ctaUrl: params.pricingUrl,
  };
}

/** Subscription cancelled (customer.subscription.deleted). */
export function subscriptionCancelledEmail(
  params: { tenantName: string; pricingUrl: string },
  locale: Locale = "tr",
): StripeEmailContent {
  if (isEn(locale)) {
    return {
      subject: "Your ERPAIO subscription was cancelled",
      heading: "Subscription cancelled",
      body: `Your ${params.tenantName} subscription was cancelled. Your account has been downgraded to Starter; your data is preserved. To resubscribe, visit the pricing page.`,
      ctaText: "Resume Pro →",
      ctaUrl: params.pricingUrl,
    };
  }
  return {
    subject: "ERPAIO aboneliğiniz iptal edildi",
    heading: "Aboneliğiniz iptal edildi",
    body: `${params.tenantName} aboneliğiniz iptal edildi. Hesabınız Starter plana düştü, verileriniz korunuyor. Yeniden başlatmak için pricing sayfasını ziyaret edin.`,
    ctaText: "Pro'ya Dön →",
    ctaUrl: params.pricingUrl,
  };
}

/** Invoice payment failed (invoice.payment_failed). */
export function paymentFailedEmail(
  params: { tenantName: string; invoiceUrl: string },
  locale: Locale = "tr",
): StripeEmailContent {
  if (isEn(locale)) {
    return {
      subject: "ERPAIO — Payment failed",
      heading: "Card payment could not be charged",
      body: `The latest payment attempt for ${params.tenantName} failed. Visit your billing page to update your card or add a new one. If unresolved within 7 days, your account will be downgraded to Starter.`,
      ctaText: "View Invoice →",
      ctaUrl: params.invoiceUrl,
    };
  }
  return {
    subject: "ERPAIO — Ödemeniz başarısız oldu",
    heading: "Kart ödemesi alınamadı",
    body: `${params.tenantName} için son ödeme denemesi başarısız oldu. Kart bilgilerinizi güncellemek ya da yeni kart eklemek için billing sayfanızı ziyaret edin. 7 gün içinde çözülmezse hesabınız Starter plana düşer.`,
    ctaText: "Faturayı Görüntüle →",
    ctaUrl: params.invoiceUrl,
  };
}
