# Stripe Setup (post-pilot billing)

ERPAIO Stripe entegrasyonu kod tarafından **hazır** ama Stripe hesabı + ürün konfigürasyonu kullanıcı (siz) tarafından yapılır.

## Adım 1: Stripe hesabı

1. https://dashboard.stripe.com/register
2. Türkiye için hesap doğrulama (D-U-N-S sertifikası gerekir kurumsal için, bireyselde TC kimlik)
3. Test mode ile başlayın (production canlı para hareketi ister)

## Adım 2: Ürünler ve fiyatlar oluştur

Stripe Dashboard → Products → New product:

**Pro Plan:**
- Name: `ERPAIO Pro`
- Pricing: ₺2.499,00 / month (recurring)
- Trial period: 14 days (opsiyonel, signup'tan da geliyor)
- Tax behavior: Inclusive (KDV dahil) veya Exclusive
- → Price ID kopyala (`price_1AbCdEfGhIj...`)

**Enterprise Plan:**
- Name: `ERPAIO Enterprise`
- Pricing: ₺15.000,00 / month (custom — sales-led)
- → Price ID kopyala

## Adım 3: Webhook endpoint kur

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://erpaio.vercel.app/api/webhooks/stripe`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- → Webhook signing secret kopyala (`whsec_...`)

## Adım 4: Vercel env vars

```bash
cd ~/erpaio
vercel env add STRIPE_SECRET_KEY production    # sk_live_... veya sk_test_...
vercel env add STRIPE_WEBHOOK_SECRET production # whsec_...
vercel env add STRIPE_PRICE_PRO production      # price_...
vercel env add STRIPE_PRICE_ENTERPRISE production # price_...
```

(Aynısını `preview` ve `development` için de ekleyin, dev'de test key kullanın.)

## Adım 5: Frontend wire-up

`/dashboard/settings` sayfasına "Plan Yükselt" butonu eklenecek (post-pilot UI iterasyonu).

İskelet:
```ts
// settings sayfasında
async function upgradeToPro() {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "pro" }),
  });
  const { url } = await res.json();
  window.location.href = url; // Stripe Checkout'a redirect
}

async function manageBilling() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const { url } = await res.json();
  window.location.href = url; // Stripe Customer Portal
}
```

## Akış

```
Kullanıcı /pricing veya /dashboard/settings'te "Pro'ya geç"
  ↓
POST /api/billing/checkout { plan: "pro" }
  ↓
Backend: Stripe Customer oluşturur (yoksa) + Checkout Session
  ↓
Stripe Checkout sayfasına redirect
  ↓
Kullanıcı kart bilgisi girer, ödeme tamamlar
  ↓
Stripe webhook → /api/webhooks/stripe (checkout.session.completed)
  ↓
Backend: tenant.plan = "pro", subscriptionStatus = "active", trialEndsAt = null
  ↓
success_url'e redirect: /dashboard/settings?upgrade=success
```

## Test mode'da test

```bash
# Stripe CLI ile webhook'ları lokale forward
stripe listen --forward-to https://erpaio.vercel.app/api/webhooks/stripe

# Test card: 4242 4242 4242 4242
# Çalışmayan card: 4000 0000 0000 0002
```

## Vergi (KVK + KDV)

- Türkiye'de B2B faturalandırma için **e-fatura** zorunlu
- Stripe Tax kullanılabilir (auto-calculation) ama Türk e-fatura entegrasyonu yok
- **Önerilen:** Stripe ödemeyi alır, parashut/logo gibi bir muhasebe yazılımı e-fatura'yı keser
- Müşteri Vergi Numarası `Stripe Customer.tax_id` field'ında tutulur

## Refunds & Cancellations

- 30 gün money-back guarantee (terms.tsx'te yazılı): manuel refund için Stripe Dashboard → Payment → Refund
- Cancellation: Stripe Customer Portal'dan kendi yapar (`/api/billing/portal`'dan açılır)
- Cancellation sonrası mevcut periyod sonuna kadar erişim, sonra plan = "starter"

## ERP entegrasyon değil!

Bu Stripe entegrasyonu **bizim ERPAIO ürünümüzün** faturalama sistemidir. Müşterinin **kendi ERP'si** ile ilişkisi yok.
