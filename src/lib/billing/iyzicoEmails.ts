/**
 * iyzico transactional email content (TR + EN).
 *
 * Feature 7 — mirrors src/lib/billing/stripeEmails.ts pattern. Same shape
 * (subject/heading/body/ctaText/ctaUrl) so the webhook composer is provider-
 * agnostic. iyzico-specific copy differences:
 *   - "kart" wording matches TR market expectation (BKM/iyzico transactions
 *     usually surface as "iyzico" on bank statement)
 *   - No "Stripe receipt" — iyzico issues its own Türkçe invoice (Türkçe
 *     fatura), so we omit invoice-attachment language
 */

export interface IyzicoEmailContent {
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

/** Subscription activated (subscription.activation). */
export function iyzicoSubscriptionActivatedEmail(
  params: { plan: string; tenantName: string; dashboardUrl: string },
  locale: Locale = "tr",
): IyzicoEmailContent {
  const planUpper = params.plan.toUpperCase();
  if (isEn(locale)) {
    return {
      subject: `ERPAIO ${planUpper} plan active`,
      heading: `Welcome to ${planUpper}`,
      body: `Your iyzico payment was received. ${params.tenantName} is now on the ${params.plan} plan. All Pro features are active: 2M monthly tokens, unlimited watchlists, full reporting. Your Turkish-format invoice is delivered separately by iyzico.`,
      ctaText: "Go to Dashboard →",
      ctaUrl: params.dashboardUrl,
    };
  }
  return {
    subject: `ERPAIO ${planUpper} planı aktif`,
    heading: `${planUpper} planına hoş geldiniz`,
    body: `iyzico üzerinden ödemeniz başarıyla alındı. ${params.tenantName} hesabınız artık ${params.plan} planında. Tüm Pro özellikler aktif: 2M aylık token, sınırsız watchlist, kapsamlı raporlama. Faturanız iyzico tarafından ayrıca size iletilir.`,
    ctaText: "Dashboard'a Git →",
    ctaUrl: params.dashboardUrl,
  };
}

/** Subscription renewal (subscription.renewal — periodic charge). */
export function iyzicoSubscriptionRenewalEmail(
  params: { plan: string; tenantName: string; dashboardUrl: string },
  locale: Locale = "tr",
): IyzicoEmailContent {
  if (isEn(locale)) {
    return {
      subject: `ERPAIO ${params.plan.toUpperCase()} plan renewed`,
      heading: "Subscription renewed",
      body: `Your iyzico subscription for ${params.tenantName} was renewed. Service continues without interruption. The Turkish-format invoice for this period is being delivered by iyzico.`,
      ctaText: "View Account →",
      ctaUrl: params.dashboardUrl,
    };
  }
  return {
    subject: `ERPAIO ${params.plan.toUpperCase()} planı yenilendi`,
    heading: "Aboneliğiniz yenilendi",
    body: `${params.tenantName} için iyzico aboneliğiniz yenilendi. Hizmetiniz kesintisiz devam ediyor. Bu döneme ait fatura iyzico üzerinden size iletilir.`,
    ctaText: "Hesabıma Git →",
    ctaUrl: params.dashboardUrl,
  };
}

/** Subscription unpaid (subscription.unpaid — payment failed retry exhausted). */
export function iyzicoSubscriptionUnpaidEmail(
  params: { tenantName: string; settingsUrl: string },
  locale: Locale = "tr",
): IyzicoEmailContent {
  if (isEn(locale)) {
    return {
      subject: "ERPAIO — Subscription payment failed",
      heading: "We couldn't charge your card",
      body: `iyzico could not charge your card for the ${params.tenantName} subscription. Please update your payment method from the billing page. If unresolved within 7 days your account will be downgraded to Starter.`,
      ctaText: "Update Payment →",
      ctaUrl: params.settingsUrl,
    };
  }
  return {
    subject: "ERPAIO — Abonelik ödemesi alınamadı",
    heading: "Kartınızdan ödeme alınamadı",
    body: `${params.tenantName} aboneliğiniz için iyzico kartınızdan ödeme alamadı. Lütfen billing sayfanızdan ödeme yönteminizi güncelleyin. 7 gün içinde çözülmezse hesabınız Starter plana düşer.`,
    ctaText: "Ödeme Yöntemini Güncelle →",
    ctaUrl: params.settingsUrl,
  };
}

/** Subscription cancellation (subscription.cancellation). */
export function iyzicoSubscriptionCancelledEmail(
  params: { tenantName: string; pricingUrl: string },
  locale: Locale = "tr",
): IyzicoEmailContent {
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

/** Trial expiring soon (subscription.trial.expire — fires 3 days before trial end). */
export function iyzicoTrialExpiringEmail(
  params: { tenantName: string; pricingUrl: string },
  locale: Locale = "tr",
): IyzicoEmailContent {
  if (isEn(locale)) {
    return {
      subject: "Your ERPAIO Pro trial ends in 3 days",
      heading: "Billing starts in 3 days",
      body: `Your Pro trial for ${params.tenantName} ends in 3 days. iyzico will then charge your saved card. To change or cancel, visit the Pricing page within 3 days.`,
      ctaText: "View Plans →",
      ctaUrl: params.pricingUrl,
    };
  }
  return {
    subject: "ERPAIO Pro denemenizin bitmesine 3 gün kaldı",
    heading: "3 gün sonra ücretlendirme başlıyor",
    body: `${params.tenantName} için Pro deneme süreniz 3 gün sonra bitecek ve iyzico kayıtlı kartınızdan ücret çekecek. Vazgeçmek için 3 gün içinde Pricing sayfasından plan değişikliği yapabilirsiniz.`,
    ctaText: "Planları İncele →",
    ctaUrl: params.pricingUrl,
  };
}
