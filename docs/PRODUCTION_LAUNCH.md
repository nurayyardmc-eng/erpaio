# ERPAIO Production Launch Checklist

Bu döküman pilot/launch öncesi yapılması gereken kontrolleri sıralar.
Her madde işaretlenince ✅ koy.

## 1. Domain & DNS

- [ ] Custom domain satın al (örn. erpaio.com.tr veya erpaio.com)
- [ ] Vercel Project → Settings → Domains → add domain
- [ ] DNS provider'da A/CNAME kayıtları
- [ ] `NEXTAUTH_URL=https://<domain>` Vercel Production env'e ekle
- [ ] SSL otomatik (Vercel Let's Encrypt)
- [ ] `next.config.ts` `connect-src` CSP'sine yeni domain eklendi mi (Sentry, OpenAPI)
- [ ] Smoke test: `SMOKE_BASE_URL=https://<domain> npm run test:smoke`

## 2. Email (Resend) DNS doğrulaması

- [ ] Resend hesabı → Domain ekle
- [ ] SPF, DKIM, DMARC kayıtlarını DNS provider'a ekle
- [ ] Resend'de "Verified" badge bekle
- [ ] `RESEND_FROM=ERPAIO <noreply@<verified-domain>>` Vercel'e ekle
- [ ] Test email: `/api/me` üzerinden şifre sıfırlama dene
- [ ] Mail Tester (https://www.mail-tester.com/) ile score check (>9/10)

## 3. Rate limit (Upstash Redis)

- [ ] https://upstash.com hesap → Redis database (free tier yeterli pilot için)
- [ ] `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` Vercel'e
- [ ] Doğrulama: `/admin/readiness` "Setup Checklist" widget'ında yeşil olmalı
- [ ] Tek instance test: forgot-password 4. denemede 429 dönmeli

## 4. Sentry (error tracking)

- [ ] sentry.io hesabı + Project (Next.js)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` Vercel'e
- [ ] `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` Vercel'e
  (production source maps upload için)
- [ ] Test error: dev'de `throw new Error("sentry test")` → dashboard'da görmek
- [ ] Slack/email notification kanalları ayarlandı

## 5. Database backup

- [ ] GitHub repo Settings → Secrets → Add `DIRECT_URL`
- [ ] Test: `.github/workflows/db-backup-weekly.yml` manuel tetikle
- [ ] Artifact indir + `pg_restore --list` ile içeriği doğrula
- [ ] Supabase'de daily auto-backup açık mı kontrol (Project Settings)

## 6. Monitoring

- [ ] `.github/workflows/smoke-test.yml` hourly cron aktif (otomatik)
- [ ] Status page (`/status`) müşteriye paylaşılabilir durumda
- [ ] Uptime monitor (örn. UptimeRobot, BetterUptime) ekle, /api/health çek
- [ ] Sentry → Slack integration

## 7. Billing

Pilot dönemde:
- [ ] Manuel faturalandırma süreci yazılı (e-fatura / havale)
- [ ] Müşteri bilgilendirildi: support@erpaio.com upgrade için

Stripe TR'de yok, iyzico planlı:
- [ ] iyzico merchant hesabı KYC
- [ ] Sandbox keys (IYZICO_*) ile test
- [ ] iyzico checkout flow tamamlanınca production keys

## 8. Müşteri onboarding

- [ ] `/help` sayfası güncel
- [ ] Setup checklist widget overview'da gözüküyor
- [ ] İlk müşteri için kişisel kurulum çağrısı planlı
- [ ] ERP read-only user oluşturma rehberi: GitHub Wiki'de

## 9. Yasal & uyum

- [ ] KVKK aydınlatma metni (`/privacy`) güncel
- [ ] Kullanım koşulları (`/terms`) güncel
- [ ] VERBIS kaydı (T.C. tüzel kişi gerekiyorsa)
- [ ] Veri işleyen sözleşmesi (DPA) hazır müşteri talep edince

## 10. İlk müşteri çağrı listesi

- [ ] Pilot müşteri 1: __________ (ERP: ____)
- [ ] Pilot müşteri 2: __________ (ERP: ____)
- [ ] Pilot müşteri 3: __________ (ERP: ____)

## 11. Acil durum kontaktları

- [ ] Domain provider hesap erişimi yedek personele verildi
- [ ] Supabase admin erişimi 2+ kişide
- [ ] Vercel team member 2+ kişi
- [ ] GitHub repo admin 2+ kişi
- [ ] Sentry/Resend/Twilio paneller 2+ kişi

## 12. Geri dönüş (rollback) prosedürü test edildi

Bkz. `docs/RUNBOOK.md` § 1 Rollback.
- [ ] Vercel dashboard'dan eski deploy'a "Promote" edilebilir mi
- [ ] Database migration rollback senaryo dokümante
- [ ] Encryption key rotation prosedürü test (admin/key-history)

---

**Bu checklist %100 ✅ olunca production launch için yeşil ışık.**
