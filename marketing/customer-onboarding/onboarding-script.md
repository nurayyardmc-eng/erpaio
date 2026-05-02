# ERPAIO Müşteri Onboarding Script

Yeni müşteri kabul süreci — Customer Success ekibinin (şu an: kurucu) takip edeceği adımlar.

---

## Pre-onboarding (Müşteri kayıt olmadan)

- [ ] **Discovery call** (15-30 dk) — pain points, ERP versiyonu, kullanıcı sayısı, beklenti
- [ ] **Pilot scope dokümante edilir** — hangi sorular, hangi metrikler kritik
- [ ] **Plan kararı** — Starter / Pro / Enterprise (genelde pilot Pro trial olur)
- [ ] **Mimari kararı** — SaaS / Cloudflare Tunnel / On-prem agent (Faza 10.6)

## Hafta 0 — Hesap kurulumu (Day 1)

- [ ] Müşteri `/signup` üzerinden kendisi hesap oluşturur
- [ ] Trial 14 gün otomatik başlar (Pro features açık)
- [ ] Müşteri admin'i `/dashboard/security` üzerinden MFA kurar (Pro özelliği)
- [ ] **Read-only DB user oluşturma rehberi** gönderilir (`db-readonly-user.md`)
- [ ] Müşteri DB admin'i SQL Server'da GRANT/DENY komutlarını çalıştırır

## Hafta 0 — ERP bağlantısı (Day 2-3)

- [ ] Müşteri `/dashboard/connections` üzerinden bağlantı bilgilerini girer
- [ ] Otomatik bağlantı testi → şema 30 sn'de taranır
- [ ] **Sample row inspection** — F10.2 sayesinde otomatik
- [ ] Müşteri ilk Türkçe sorularını sorar — 3-5 örnek soruyla denenir

## Hafta 1 — Annotation seansı (Day 4-5)

- [ ] **1-2 saatlik canlı seans** (Customer Success ile)
  - Müşteri ERP'sinin özel tabloları gözden geçirilir
  - `/dashboard/annotations` üzerinden:
    - "Bu tablo bizde sadece online satışları tutar" → not ekle
    - "Şu kolon iade kodu, profile'da yanlış" → düzelt
    - "Hassas tablo" → hidden flag
  - 10-20 annotation eklenir genellikle
- [ ] Anomaly threshold'ları gözden geçirilir (`/dashboard/settings`)

## Hafta 1 — Bildirim kurulumu (Day 5)

- [ ] WhatsApp Sandbox bağlantısı (Twilio sayesinde — pilot için bizim hesap)
- [ ] Email recipient (`tenant.emailTo`)
- [ ] Mobile app indirme + push notification testi
- [ ] Test alert tetiklenir (`/dashboard/alerts` test butonu)

## Hafta 2 — Self-service (Day 8-14)

- [ ] Müşteri kendi başına 50+ soru atar, 👍/👎 verir
- [ ] QueryCache dolar, cache hit oranı %30+'a çıkar
- [ ] Customer Success arada 2-3 kez bakar, ek annotation önerir
- [ ] Pilot retrospective: ne işe yaradı, ne yaramadı

## Hafta 3-4 — Trial bitişi

- [ ] Trial bitimine 7 gün kala otomatik email gider (`tenant.trialEndsAt`)
- [ ] Müşteri `/pricing`'e yönlendirilir
- [ ] Pro plan'a geçişi onaylar (manuel — billing entegrasyonu post-pilot)
- [ ] Token budget (Pro) 20M/ay aktif

## Hafta 4+ — Üretim kullanımı

- [ ] **Aylık check-in** (15 dk) — ne çalışıyor, ne çalışmıyor
- [ ] **Quarterly business review** — yeni özellik istekleri, ROI raporu
- [ ] Customer Success `/admin` panelinde token kullanımı izler
- [ ] %80+ token kullanımında müşteriyle konuşur, plan upgrade öner

---

## Dahili kontrol listesi (Customer Success)

### İlk hafta dikkat:
- [ ] **Cross-tenant testi geçti mi?** (Yeni müşteri → eski müşteri data sızması)
- [ ] **Token usage anormal mi?** İlk 2 gün spike normal, sonra plato beklenir
- [ ] **Hata oranı?** `/dashboard/audit?success=false` → %5 üzeri ise inceleme
- [ ] **Slow queries var mı?** Sentry'de p95 > 5s ise optimize gerekir
- [ ] **Schema değişiyor mu?** F11.1'de invalidation otomatik — log'ta event görülür

### Pilot sonrası feedback alınacaklar:
- Neyi ararken bulamadın?
- Hangi sorular yanlış cevaplandı?
- Hangi metrikler eksik?
- Mobile app deneyimi (iOS/Android)
- ROI: pilot kullanım sonrası işten ne kadar zaman tasarrufu?

### Pilot sonrası gerekirse:
- Custom annotations bulk import (admin tool)
- Custom anomaly metric ekleme (manuel SQL profile.yaml düzenle)
- On-prem agent (Faza 10.6) — eğer DB'yi public aşılamayacaksa
- SAP/Oracle profile başlatma (eğer 2. müşteri bu ERP'de ise)

---

## Eskalasyon

- **Müşteri DB'sini killing query** → Vercel logs + Sentry, hemen pause
- **Hallucination şüphesi** → Confidence score < 0.5 ise kullanıcı zaten onaylar (F10.3) ama hatalı SQL execute olursa hızlı diagnose
- **Data sızma şüphesi** → tüm tenant token'ları revoke + Sentry incident + müşteriye 24h içinde bildirim
- **Cron failure 3+ kez** → operations rotation rota
