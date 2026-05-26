/**
 * iyzico billing provider — Türkiye için Stripe alternatifi.
 *
 * Track JJJJJJJ — iyzico merchant API entegrasyonu için scaffold.
 * Şu anda env eksik → tüm methodlar null/false döner; isIyzicoConfigured()
 * gate her call-site'da.
 *
 * Env variables (production'da Vercel'e eklenecek):
 *   IYZICO_API_KEY        — merchant panel → API Yönetimi → API Anahtarı
 *   IYZICO_SECRET_KEY     — merchant panel → API Yönetimi → API Secret
 *   IYZICO_BASE_URL       — sandbox: https://sandbox-api.iyzipay.com
 *                          production: https://api.iyzipay.com
 *
 * Setup checklist:
 *   1. https://merchant.iyzipay.com kayıt + KYC
 *   2. Sandbox keys ile test (.env.local)
 *   3. Live keys ile production
 *   4. Webhook endpoint: /api/webhooks/iyzico (kayıt panel'den)
 *   5. CRON_SECRET gibi IYZICO_WEBHOOK_SECRET set et
 *
 * Şu an no-op: stripe.ts gibi davranıyor. Real entegrasyon iyzipay npm
 * paketi ile (https://www.npmjs.com/package/iyzipay) tamamlanacak.
 */

export const IYZICO_PRICE_IDS: Record<"pro" | "enterprise", string | undefined> = {
  pro: process.env.IYZICO_PRICE_PRO,
  enterprise: process.env.IYZICO_PRICE_ENTERPRISE,
};

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * Read iyzico config from env. Returns null when credentials missing —
 * call sites should gate via isIyzicoConfigured().
 */
export function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  return {
    apiKey,
    secretKey,
    baseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
  };
}

export function isIyzicoConfigured(): boolean {
  return getIyzicoConfig() !== null;
}

/**
 * Composite payment provider check — Stripe veya iyzico'dan biri aktifse
 * pricing page upgrade flow çalışır.
 */
export function isPaymentProviderConfigured(): boolean {
  return (
    isIyzicoConfigured() ||
    !!process.env.STRIPE_SECRET_KEY
  );
}

/**
 * Pick the active payment provider. Returns "iyzico" if env present
 * (TR-priority), else "stripe", else "manual" (admin contact path).
 */
export type PaymentProvider = "iyzico" | "stripe" | "manual";

export function pickPaymentProvider(): PaymentProvider {
  if (isIyzicoConfigured()) return "iyzico";
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "manual";
}
