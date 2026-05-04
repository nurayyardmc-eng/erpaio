# ERPAIO

> Türkçe doğal dil → SQL → ERP. Anomaly tespiti, anlık dashboard, çok kanallı bildirim.

[![Production](https://img.shields.io/badge/production-erpaio.vercel.app-0A0A0A)](https://erpaio.vercel.app)
[![Tests](https://img.shields.io/badge/tests-63%20passing-10B981)]()
[![License](https://img.shields.io/badge/license-Proprietary-EF4444)]()

ERP veritabanlarınızı (Nebim V3, SAP, Dynamics 365, PostgreSQL/Odoo) **read-only** bağlantıyla okur. Türkçe doğal dilde sorulan soruları AI ile SQL'e çevirir, sonuçları yorumlar. Saatlik anomaly detection, WhatsApp/email/push bildirim.

---

## Hızlı başlangıç

### Gereksinimler
- Node.js 20+, npm 10+
- PostgreSQL (Supabase önerisi) — uygulama veritabanı
- Bağlanılacak ERP DB (MS SQL veya PostgreSQL — read-only kullanıcı)
- Anthropic API key
- Resend API key (email)
- Twilio (opsiyonel — WhatsApp)
- Upstash Redis (opsiyonel — rate limit; in-memory fallback var)

### Kurulum
```bash
git clone https://github.com/nurayyardmc-eng/erpaio.git
cd erpaio
npm install
cp .env.example .env  # Aşağıdaki env'leri doldur
npx prisma migrate deploy
npm run dev           # http://localhost:3000
```

### Environment variables
```bash
# Required
DATABASE_URL=postgresql://...           # Supabase pooled
DIRECT_URL=postgresql://...             # Migration için pooler bypass
NEXTAUTH_SECRET=<openssl rand -hex 32>
NEXTAUTH_URL=http://localhost:3000      # Production'da custom domain
ENCRYPTION_KEY=<openssl rand -hex 32>   # 64-char hex (32 byte) — ERP şifre encryption
ANTHROPIC_API_KEY=sk-...                # Claude AI
CRON_SECRET=<openssl rand -hex 32>      # GitHub Actions cron auth

# Email
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev       # Domain alındıktan sonra noreply@erpaio.com

# Optional
TWILIO_ACCOUNT_SID=AC...                # WhatsApp
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
UPSTASH_REDIS_REST_URL=https://...      # Multi-instance rate limit
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_AUTH_TOKEN=...                   # Sentry source maps
NEXT_PUBLIC_SENTRY_DSN=https://...
```

---

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack, "proxy" middleware), TypeScript
- **Auth**: NextAuth v5 beta — JWT session (web) + Bearer token (mobile/API)
- **Database**: Prisma 5.22 + PostgreSQL (Supabase) — 27 model, multi-tenant
- **AI**: Anthropic Claude (Sonnet 4 + Haiku) — prompt caching
- **Notifications**: Twilio WhatsApp, Resend Email, Expo Push, Slack/Teams webhook
- **Hosting**: Vercel (Hobby plan, GitHub auto-deploy)
- **Observability**: Sentry, GitHub Actions hourly cron
- **Security**: AES-256-GCM ERP credential encryption + key rotation, MFA (TOTP), IP allowlist

## Komutlar

```bash
npm run dev                  # Dev server (Turbopack)
npm run build                # Production build
npm test                     # Vitest 63 tests
npx tsc --noEmit             # TypeScript check
npx prisma migrate dev       # Yeni migration oluştur
npx prisma migrate deploy    # Production'a uygula
npx prisma studio            # DB GUI (dev only)
vercel --prod --yes          # Manual deploy (CLI)
```

## Mimari

```
src/
├── app/                # Next.js App Router (60+ pages, 50+ API routes)
│   ├── api/            # REST + OpenAPI
│   ├── dashboard/      # Auth-required app (chat, alerts, audit, settings, ...)
│   ├── (public)/       # /pricing, /privacy, /terms, /docs, /help, /about, /changelog
│   └── layout.tsx      # Root: Inter + Playfair fonts, Toaster + ConfirmHost
├── components/         # Reusable (Toaster, Confirm, EmptyState, Logo, Pagination)
├── lib/
│   ├── auth.ts             # NextAuth config + lockout
│   ├── auth/dual.ts        # Session+Bearer auth helper
│   ├── crypto/             # AES-256-GCM + key rotation
│   ├── db/connector.ts     # MS SQL + PostgreSQL dual ERP connector
│   ├── validators/sql.ts   # Read-only validator (50+ test)
│   ├── notifications/      # email, whatsapp, push, slack, teams, webhook
│   └── theme.ts            # Color tokens (warm B&W)
└── proxy.ts            # Auth middleware + maintenance + lang routing
```

## Çekirdek konseptler

- **Multi-tenant**: TÜM Prisma queries `tenantId` filtresi (security boundary)
- **Read-only ERP**: SQL validatör SELECT/WITH only + 15+ blocked patterns + Turkish injection patterns
- **Schema-aware AI**: ERP şeması taranır, sample rows + annotations Claude'a context olarak verilir
- **Anomaly detection**: Saatlik cron — baselines + linear regression forecast
- **Multi-channel notification**: Tenant başına WhatsApp/email/push/Slack/Teams

## Test

```bash
npm test                     # Tüm testler (63 geçiyor)
npm test -- --watch          # Watch mode
npm test sql.security        # Tek dosya
```

Kritik fonksiyonlar:
- `src/lib/validators/sql.test.ts` — SQL validator (40+ test)
- `src/lib/validators/sql.security.test.ts` — SQL injection patterns (10+ test)
- `src/lib/anomaly/detectors.test.ts` — Anomaly detection
- `src/lib/cache/queryCache.test.ts` — Query cache invalidation
- `src/lib/csv.test.ts` — CSV export
- `src/lib/analytics/forecast.test.ts` — Linear regression

## Deploy

GitHub'a push → Vercel auto-deploy (main branch only, vercel.json'da kilitli).

```bash
git push origin main         # Auto-deploy
vercel --prod --yes          # Manual override
```

Migration:
```bash
npx prisma migrate deploy    # Production DB'ye apply
```

## Tasarım sistemi

- **Theme**: Warm B&W (`#FAFAF8` bg, `#0A0A0A` text)
- **Font**: Inter (body) + Playfair Display (serif başlıklar) + JetBrains Mono (mono labels)
- **Icons**: Lucide React
- **Buttons**: Pill style (radius 100), hairline borders (rgba 0.08)
- **Logo**: `variant="full"` (auth/maintenance) ve `variant="mark"` (header/404)

## Lisans

Proprietary. © 2026 ERPAIO, İstanbul.

## İletişim

- Destek: [support@erpaio.com](mailto:support@erpaio.com)
- Demo: [demo@erpaio.com](mailto:demo@erpaio.com)
- Production: https://erpaio.vercel.app
