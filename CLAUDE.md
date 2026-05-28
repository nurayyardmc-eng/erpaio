@AGENTS.md

# ERPAIO — Mimari ve Geliştirme Notları

## Ne yapar?
Türkçe doğal dil → SQL → ERP veritabanı sorgu üretimi. Anomaly tespiti, çoklu kanal bildirim (WhatsApp/email/push), pre-computed dashboard, çok kiracılı (multi-tenant) SaaS.

## Tech Stack
- **Next.js 16** (App Router, Turbopack, "proxy" middleware) — Vercel hosting
- **NextAuth v5 beta** (JWT session + Bearer token dual auth)
- **Prisma 5.22 + Postgres** (Supabase) — 27 model
- **Anthropic Claude** (Sonnet 4 + Haiku) — prompt caching aktif
- **Twilio** WhatsApp, **Resend** email, **Upstash Redis** rate limit (in-memory fallback)
- **AES-256-GCM** encryption + key rotation
- **Sentry** observability + GitHub Actions hourly cron

## Çekirdek konseptler
- **Multi-tenant**: Her Prisma sorgusunda `tenantId` filtresi (security boundary)
- **Read-only ERP**: ERP DB'lerinde sadece SELECT — `src/lib/validators/sql.ts` 50+ test ile koruma
- **Dual auth** (`src/lib/auth/dual.ts`): Session cookie (web) + Bearer token (mobile/API)
- **Encrypted credentials**: ERP şifreleri AES-256-GCM, key rotation
- **Schema-aware AI**: ERP tablolarını taradıktan sonra AI sorgu üretir + sample rows ile bağlam

## Proje yapısı
```
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── (landing)               # /pricing, /privacy, /terms, /docs, /help, /about, /changelog
│   ├── api/                    # 50+ API endpoint
│   ├── dashboard/              # Auth-required app
│   │   ├── layout.tsx          # Sidebar + header wrapper
│   │   ├── chat/               # AI sorgu sohbeti (~730 satır)
│   │   ├── alerts/, audit/, ...
│   │   └── settings/           # Profilim, Şirket, MFA, DangerZone
│   ├── layout.tsx              # Root: Inter + Playfair fonts, Toaster + ConfirmHost
│   └── error.tsx, not-found.tsx
├── components/                 # Toaster, Confirm, EmptyState, Logo, Pagination, vb.
├── lib/
│   ├── auth.ts                 # NextAuth config + lockout
│   ├── auth/dual.ts            # Session+Bearer auth helper
│   ├── crypto/                 # AES-256-GCM + key rotation
│   ├── db/connector.ts         # MS SQL + Postgres dual ERP connector
│   ├── validators/sql.ts       # Read-only validator (whitelist + 15+ blocked patterns)
│   ├── notifications/          # email, whatsapp, push, slack, teams, webhook
│   ├── anomaly/, analytics/    # detection + forecasting
│   └── theme.ts                # Color tokens (warm B&W: #FAFAF8/#0A0A0A)
└── proxy.ts                    # Auth middleware + maintenance + lang routing
```

## Tasarım sistemi
- **Theme**: Warm B&W (`#FAFAF8` bg, `#0A0A0A` text), navy yok
- **Font**: Inter (body) + Playfair Display (serif başlıklar) + JetBrains Mono (mono labels)
- **Logo**: `/public/logo.svg` (full bars+text) + `/public/logo-mark.svg` (sadece bars)
- **Logo component**: `variant="full"` (auth/maintenance) ve `variant="mark"` (header/404)
- **Icons**: Lucide React (emoji yok, kurumsal tutarlılık)
- **Buttons**: Pill style (border-radius: 100), hairline borders (rgba 0.08)
- **Components**: Toast/ConfirmDialog (event-based, root layout mount), EmptyState, Skeleton, Pagination

## Önemli komutlar
```bash
npm test                 # 2143 test (vitest)
npx tsc --noEmit         # type check
npm run build            # production build (turbopack)
npx prisma migrate deploy # Production DB migrations
vercel --prod --yes      # Manual deploy (sadece /Users/nurayyardimci/erpaio'dan)
```

## Çoklu dil
- Landing 3 dilde: `/public/landing.html` (EN), `landing-tr.html`, `landing-ar.html` (RTL)
- Cookie-based middleware rewrite (`erpaio_lang` cookie)
- Dashboard sadece TR (multi-lang refactor pending)

## API conventions
- Auth: `getAuth(req)` veya `requireAuth(req)` (dual.ts), sysadmin için `requireSysAdmin(req)`
- Validation: `parseJsonBody(req, Schema)` ve `parseQuery(req, Schema)` — Response yoksa parsed döner, varsa 400
- Rate limit: `rateLimit(key, { prefix, max, windowMs })` — Upstash + in-memory fallback. 429 için `rateLimited429(req, limit)` (Retry-After header)
- Body size: `checkBodySize(req)` — 1MB default
- Tenant scoping: TÜM Prisma where clause'larında `tenantId`

## Shared helpers
- **HTTP responses** (`lib/http/searchParams.ts`):
  - Error: `userNotFoundError`/`tenantNotFoundError`/`watchlistNotFoundError`/`connectionNotFoundError`/`activeConnectionNotFoundError`/`savedQueryNotFoundError` (404)
  - `invalidQuestionError`/`incorrectPasswordError`/`noFieldsToUpdateError` (400)
  - `sqlNotInHistoryError` (422), `sqlExecutionError`/`internalServerError` (500), `sqlValidationError` (400 with details)
  - `getRequiredIdParam(req)` — query `?id=` zorunluluğu için
- **Client fetch** (`lib/http/clientFetch.ts`): `postJson(url, body)` / `patchJson` / `putJson` / `deleteJson` — dashboard pages için. Response döner, caller `.json()` + error UX kendi yapar.
- **DB ownership** (`lib/db/`): `assertOwnedConnection`/`findOwnedConnection`/`assertOwnedWatchlist`/`findActiveErpConnectionForChat` ve `lib/chat/assertOwnedChatSession`/`findOwnedChatSessionWithMessages`
- **Auth tokens** (`lib/auth/`): `createMobileApiToken`/`createEmailVerificationToken`/`createPasswordResetToken`/`hashPassword`/`verifyUserPassword`
- **Chat helpers** (`lib/chat/`): `findLastSqlForQuestion`/`buildPromptContext`/`extractColumns`/`ensureChatSession`/`persistChatExchange`
- **AI helpers** (`lib/ai/`): `extractAnthropicText(msg, fallback?)`/`stripCodeFences(raw)`/`dialectRules(isPostgres)`
- **Cron** (`lib/cron/`): `assertCronAuth`/`acquireCronLock`/`finalizeCronRun`/`cronSkipResponse`/`deriveCronFinalStatus`
- **Constants**: `ALERT_STATUSES`/`NOTIFICATION_CHANNELS`/`NOTIFICATION_STATUSES`/`INTEGRATION_KINDS`/`ERP_TYPES`/`CRON_STATUSES`/`THRESHOLD_OPS`/`SEVERITY_VALUES`
- **Utility**: `errorMessage(err)` (lib/errors), `toPrismaJson(obj)` (lib/db), `daysAgo(n)`/`daysFromNow(n)` (lib/time/units), `retentionCutoff(days)` (lib/cron/retention)

## Production
- URL: https://erpaio.vercel.app
- Health: `/api/health` (DB + version)
- Cron: GitHub Actions (Hobby plan) — hourly anomaly, daily reports, daily watchlists
- Env vars: Vercel Production (Resend, Anthropic, Sentry, Twilio, Encryption Key)
- Opsiyonel env: `SYSADMIN_NOTIFY_EMAIL` (comma-separated) — daily cleanup cron son 24h'taki cron başarısızlıklarını tek özet email olarak bu adreslere yollar. Boşsa no-op.

## Bilinen kısıtlar
- Vercel Hobby: 100 deploy/gün → toplu commit önerilir
- Stripe TR'de yok → manuel pilot faturalandırma (iyzico planlı)
- Domain: erpaio.vercel.app (custom domain alınmadı)
- Email DNS: Resend onboarding@resend.dev (test, deliverability düşük)
