# Disaster Recovery Plan

Kritik servislerin failure senaryoları ve recovery prosedürleri. Bu doküman herhangi bir incident'ta hızlı karar verme rehberidir.

---

## RPO / RTO Hedefleri

| Servis | RPO (data loss tolerance) | RTO (downtime tolerance) |
|---|---|---|
| Vercel (web/API) | 0 (stateless) | 15 dk |
| Supabase (Postgres) | 24 saat (PITR) | 4 saat |
| Sentry (logs) | 30 gün | 0 (degraded ops devam) |
| Twilio (WhatsApp) | 0 | 2 saat (degraded — push fallback) |
| Resend (email) | 0 | 4 saat (degraded) |

---

## Senaryo 1: Vercel kesintisi

**Belirti:** `https://erpaio.vercel.app` 500 / timeout, status.vercel.com'da incident.

**Adımlar:**
1. **Communicate first:** `/status` page ve email (pilot müşterilere)
2. Vercel incident süresince beklemek genelde 5-30 dk
3. Eğer 1 saatten uzun: alternative deploy
   - Backup: AWS Amplify hesabı (önceden setup)
   - DNS: erpaio.vercel.app → A record değişikliği (Cloudflare üzerinden, 5 dk)
4. **Müşteri etkisi:** Web/API erişilemez. Mobile app cached data ile çalışmaya devam eder.

**Önleyici:** Multi-region deployment Pro Vercel'de var — şu an Hobby'de tek region.

---

## Senaryo 2: Supabase Postgres veri kaybı

**Belirti:** Connection error veya tablo eksik.

**Adımlar:**
1. Supabase dashboard → Database → Backups → en son PITR snapshot'a restore
   - Free tier: 7 gün PITR, Pro: 30 gün
2. Restore süreci: 5-15 dk (DB boyutuna göre)
3. **Veri kaybı:** son snapshot ile şu an arası — max 24h Free, max 1h Pro
4. Restore sonrası: `prisma migrate deploy` ile schema sync

**Önleyici:**
- Supabase Pro upgrade ($25/ay) — daha sık snapshot
- Custom periodic export (nightly): `pg_dump` cron → S3 (post-pilot)

---

## Senaryo 3: ENCRYPTION_KEY kaybı

**Belirti:** ERP bağlantı şifrelerinin decrypt edilememesi.

**Adımlar:**
1. **Bu KRİTİK** — eski şifreler artık çözülemez
2. Müşterilere bildirim: "Güvenlik nedeniyle ERP credential'larınızı yeniden girmenizi rica ederiz"
3. `prisma erpConnection` tablosundaki `passwordEnc` column'larını NULL yap
4. Müşteri admin'leri /dashboard/connections üzerinden yeniden girer

**Önleyici:**
- ENCRYPTION_KEY'i 1Password / AWS Secrets Manager'da redundant sakla
- Yıllık rotation NEKADAR (key versioning ile, eski key decrypt için tutulur)

---

## Senaryo 4: Anthropic API kesintisi

**Belirti:** /api/chat 502/503, status.anthropic.com'da incident.

**Adımlar:**
1. **Graceful degradation:** Yeni chat yanıtları başarısız ama:
   - QueryCache hits çalışmaya devam (Claude'a gitmiyor)
   - /dashboard/overview pre-computed metrics çalışıyor
   - Anomaly detection cron etkilenmez (SQL execute, AI yok)
2. Kullanıcıya net mesaj: "AI servisi geçici olarak kesinti yaşıyor, kayıtlı sorgular çalışıyor"
3. 1+ saat sürerse: **fallback model** (Claude Haiku ucuz/hızlı, ya da başka provider)

**Önleyici:** Multi-provider abstraction (post-pilot, OpenAI fallback)

---

## Senaryo 5: Müşteri DB'si killing query

**Belirti:** Müşteri DB CPU %100, ERPAIO query timeout.

**Adımlar:**
1. **Hemen:** mssql connection pool kill — `pool.close()` Prisma admin
2. Müşteriye bildir: "X sorgusu DB'nizi yorgun düşürdü, optimize ediyoruz"
3. Sorguyu QueryCache'den negative feedback ile invalidate
4. Sentry'de `[component:chat]` filter'la o sorguyu inceleme
5. Profile veya annotation'a düzeltme ekle

**Önleyici:**
- `requestTimeout: 15s` mevcut (Faza 7.5)
- Read replica yönlendirmesi (post-pilot)
- Resource governor profile (SQL Server'ın kendi feature'ı, müşteri admin'i ayarlar)

---

## Senaryo 6: Veri sızma şüphesi

**Belirti:** Tenant A'nın query'sinde Tenant B verisi görüldü, Sentry'de anormal pattern.

**Adımlar:**
1. **EN ÖNCELIKLI** — anlık olarak:
   - Tenant A + Tenant B token'ları tüm aktif sessions revoke (`prisma.apiToken.updateMany({revoked: true})`)
   - Ham connection pools kapat
   - Sorunlu deployment'ı rollback (`vercel rollback` önceki deploy'a)
2. **24 saat içinde:** etkilenen müşterilere bildirim (KVKK md. 12 + GDPR Art. 33)
3. Forensic analysis: Sentry breadcrumb'ları + audit log
4. Root cause + post-mortem yayınla

**Önleyici:**
- Faza 14 X1'deki cross-tenant test suite genişletilmeli
- Tenant ID middleware her endpoint'te zorla
- Penetration test (yıllık)

---

## Senaryo 7: Domain hijack / DNS attack

**Belirti:** erpaio.vercel.app farklı yere yönlendiriliyor, müşteriler "phishing site açıldı" diyor.

**Adımlar:**
1. Cloudflare DNS — registrar lock zaten açık olmalı
2. 2FA Vercel hesabı — kompromise olmuş mu?
3. DNS rollback önceki kayıtlara
4. Müşterilere: "Lütfen geçici olarak login olmayın" — Twitter + email broadcast
5. Tüm session revoke: `prisma.apiToken.updateMany({revoked: true})`

**Önleyici:**
- Domain registrar 2FA + alerts
- Vercel hesabı 2FA + audit log
- Cloudflare DNSSEC açık

---

## On-call rotation (post-pilot)

Şu an: kurucu (24/7)
Pilot 5+ müşteride: 2 kişilik rotation
Enterprise müşterisinde: dedicated 24/7 SLA team (Pro+ destek)

İletişim:
- Müşteri: support@erpaio.com (4h response)
- Pilot incident: kurucu telefon (1h response)
- Enterprise critical: dedicated Slack channel (15 min response)

---

## Yıllık tatbikat

- 1x/yıl: tam senaryo simülasyonu (her senaryo bir gün)
- 1x/yıl: penetration test (3rd party güvenlik firması)
- 4x/yıl: backup restore drill (gerçek restore deniyoruz)
