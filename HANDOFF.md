# ERPAIO — Devir Teslim Kılavuzu (HANDOFF)

Bu dosya, projeyi devralan geliştirici/sahip içindir. Mimari detaylar için
ayrıca **CLAUDE.md** ve **AGENTS.md**'yi oku.

> **ERPAIO nedir?** Türkçe doğal dil → SQL → ERP veritabanı sorgu üretimi.
> Anomali tespiti, çoklu kanal bildirim, pre-computed dashboard, çok kiracılı
> (multi-tenant) SaaS. Next.js 16 + Prisma + Postgres + Anthropic Claude.

---

## 1. İlk gün — lokalde çalıştırma

```bash
# 1) Bağımlılıklar (Node 20+ önerilir)
npm install

# 2) Ortam değişkenleri
cp .env.example .env.local
#    → .env.local içini KENDİ değerlerinle doldur (bkz. bölüm 3)

# 3) Prisma client üret
npx prisma generate

# 4) Geliştirme sunucusu
npm run dev          # http://localhost:3000
```

Doğrulama komutları:
```bash
npm test             # vitest (tüm test suiti)
npm run typecheck    # tsc --noEmit
npm run build        # production build (prisma generate + next build)
```

---

## 2. Sahiplik devri — hesapları KENDİ e-postanla yeniden kur

Tüm dış servisler, devralan kişinin **kendi e-postasıyla açtığı kendi
hesaplarıyla** değiştirilebilir. Her servis bir/birkaç env değişkenine karşılık
gelir; kendi hesabını açıp anahtarı `.env.local` + Vercel'e yaz, eski değeri at.

| Servis | Ne için | İlgili env |
|---|---|---|
| **Supabase** | Postgres DB | `DATABASE_URL`, `DIRECT_URL` |
| **Vercel** | Hosting + deploy | (proje sahipliği transferi) |
| **GitHub** | Repo + Actions cron | (repo sahipliği transferi) |
| **Anthropic** | AI (Claude) | `ANTHROPIC_API_KEY` |
| **Resend** | E-posta | `RESEND_API_KEY`, `RESEND_FROM` |
| **Twilio** | WhatsApp (ops.) | `TWILIO_*` |
| **Sentry** | Hata izleme | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` |
| **PostHog** | Analytics | `NEXT_PUBLIC_POSTHOG_*` / `POSTHOG_*` |
| **Upstash** | Rate limit (ops.) | `UPSTASH_REDIS_*` |
| **iyzico / Stripe** | Faturalama (ops.) | `IYZICO_*` / `STRIPE_*` |

Kendi tarafından üretilenler (hesap değil):
- `NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `ENCRYPTION_KEY` → `openssl rand -hex 32` (⚠️ bkz. uyarı)
- `CRON_SECRET` → rastgele min 16 karakter

> Tüm değişkenlerin açıklaması `.env.example` içinde. Şema `src/lib/env.ts`
> (Zod) ile doğrulanır — eksik/yanlış değişken build/başlatmada hata verir.

### ⚠️ ENCRYPTION_KEY hakkında kritik uyarı
ERP bağlantı şifreleri bu anahtarla **AES-256-GCM** ile şifrelenir. Anahtarı
değiştirirsen **mevcut tüm ERP credential'ları okunamaz** hale gelir. Sıfırdan
DB ile başlıyorsan yeni anahtar üret. Mevcut prod DB'yi devralıyorsan **aynı
anahtarı** kullanmalısın ya da key-rotation prosedürünü uygula
(`src/lib/crypto/`). Devir sonrası güvenlik için rotasyon önerilir.

---

## 3. ⏳ Devralırken BEKLEYEN tek "canlı" iş

**Production DB şeması, koddaki şemanın gerisinde** (örn. `defaultLocale` ve
bazı kolonlar eksik). Bu yüzden canlıda **günlük retention cron + signup**
hata veriyor. Düzeltme (prod `DATABASE_URL` ile, **bir kez**):

```bash
DATABASE_URL="<PROD_DATABASE_URL>" DIRECT_URL="<PROD_DIRECT_URL>" \
  npx prisma db push
```
- `--accept-data-loss` **kullanma** — yalnızca additive (kolon ekleme) yapsın.
- Yeni/temiz bir DB ile başlıyorsan zaten `db push` ilk kurulumu yapar, bu
  sorun oluşmaz.

---

## 4. Bilmen gereken tuzaklar (yoksa kafan karışır)

- **Prod şema `db push` ile yönetiliyor, `migrate deploy` ile DEĞİL.**
  Migrations klasörü repo içinde tutarlı (onarıldı) ama **mevcut prod'a
  `migrate deploy` çalıştırma** — tablolar zaten var, çakışır. Şema değişikliği
  = `prisma db push`.
- **Landing `/` → `/landing-ssr`'a middleware rewrite** ile servis ediliyor
  (`src/proxy.ts`). Landing içinde route'lar arası geçişte Next `<Link>` yerine
  düz `<a>` kullan (Link, middleware rewrite'ı atlayıp navigasyonu bozuyor).
- **Tailwind v4 PostCSS kurulu ama `@import "tailwindcss"` YOK** → utility
  class'lar no-op. Stil için inline style + CSS değişkenleri + `landing.css`.
- **Çok kiracılı güvenlik:** her Prisma sorgusunda `tenantId` filtresi zorunlu
  (güvenlik sınırı). ERP DB'lerinde sadece SELECT (`src/lib/validators/sql.ts`).
- **Vercel Hobby:** 100 deploy/gün. Cron, GitHub Actions ile (saatlik anomali,
  günlük rapor/watchlist).
- **Dashboard sadece TR;** landing TR/EN/AR.

---

## 5. Mimari hızlı harita

```
src/
├── app/            # Next.js App Router — sayfalar + 50+ API route
│   ├── (landing)   # pricing/privacy/terms/docs/help/about/changelog
│   ├── api/        # endpoint'ler (getAuth/requireAuth ile korunur)
│   └── dashboard/  # auth-gerekli uygulama (chat, alerts, audit, settings...)
├── components/     # Toaster, Confirm, EmptyState, Logo, Pagination...
├── lib/
│   ├── auth*       # NextAuth v5 + dual (session + Bearer token)
│   ├── crypto/     # AES-256-GCM + key rotation
│   ├── db/         # MSSQL + Postgres dual ERP connector
│   ├── validators/sql.ts   # read-only SQL guard (whitelist + blocked patterns)
│   ├── notifications/      # email/whatsapp/push/slack/teams/webhook
│   ├── anomaly/ analytics/ # detection + forecasting
│   └── i18n/ landing/      # çok dilli içerik katalogları
└── proxy.ts        # auth middleware + maintenance + dil yönlendirme
```

Detaylı kurallar (API conventions, shared helper'lar, design system) → CLAUDE.md.

---

## 6. Devir teslim checklist

- [ ] Repo sahipliği GitHub'da devredildi
- [ ] Vercel projesi devredildi (env'ler dahil)
- [ ] Supabase DB devredildi / yeni DB kuruldu
- [ ] Tüm servis hesapları yeni sahibe geçti (bölüm 2 tablosu)
- [ ] Sırlar güvenli kanalla aktarıldı **ve rotate edildi**
- [ ] (Mevcut prod devralındıysa) bölüm 3'teki `db push` çalıştırıldı
- [ ] `npm install && npm test && npm run build` lokalde geçti
- [ ] `/api/health` prod'da 200 dönüyor
```
