# ERPAIO — App Store Metadata

App Store Connect'te kullanılacak metinler.

---

## App Name

**ERPAIO** (uluslararası)

**Localized name (TR):** ERPAIO — ERP Sorgu Asistanı

---

## Subtitle (30 char)

**TR:** Türkçe ile ERP'nize sorun
**EN:** Ask your ERP in plain Turkish

---

## Promotional Text (170 char)

**TR:**
> Stok, ciro, müşteri verileri — hepsi cebinizde. Türkçe doğal dilde soru sorun, AI saniyeler içinde yanıt versin. WhatsApp/email bildirim, anomaly tespit.

**EN:**
> Stock, revenue, customer data — all in your pocket. Ask in natural Turkish, get answers in seconds. WhatsApp/email alerts, anomaly detection.

---

## Description (4000 char)

**TR:**

```
ERPAIO — ERP Sorgu Asistanı

ERP veritabanınızı (Nebim V3, SAP, Dynamics 365, Logo, Mikro, PostgreSQL/Odoo) Türkçe doğal dille sorgulayın. Yapay zeka SQL üretir, sonuçları yorumlar.

✦ TÜRKÇE DOĞAL DİL
"İstanbul mağazalarında bu ay toplam ciro ne kadar?" gibi sorular yazın. AI cümlenizi anlar, doğru SQL'i üretir, sonucu açıklar.

✦ ANINDA YANIT
Tipik sorgu: 1-3 saniye. Cache'lenmiş sorgular saniye altı. Karmaşık JOIN'ler dahil AI tarafından optimize edilir.

✦ READ-ONLY GÜVENLİK
ERP'nizde sadece SELECT yetkili kullanıcı kullanılır. INSERT/UPDATE/DELETE asla çalıştırılmaz. 50+ test ile korunan SQL validator.

✦ ANOMALY TESPİT
Saatlik otomatik kontrol. Z-score, hareketli ortalama, eşik tabanlı tespit. Stok kritik seviyeye düşünce / ciro %20+ sapınca → WhatsApp / Push / Email bildirim.

✦ ÇOKLU KANAL BİLDİRİM
• Push notification (cihaz)
• WhatsApp (Twilio)
• Email (Resend)
• Slack / Teams / Webhook

✦ ŞİFRELEME
AES-256-GCM ile ERP credential'ları şifrelenir. Bcrypt password hashing. JWT session.

✦ ÇOK KİRACILI
Multi-tenant izolasyon. Her şirket verisi diğerinden tamamen ayrı.

✦ TAKIM YÖNETİMİ
Owner / Admin / Viewer rolleri. Email davet, MFA (TOTP), aktivite logu.

✦ İKİ FAKTÖRLÜ DOĞRULAMA
Authenticator app destekli (Google Authenticator, 1Password, Authy).

✦ FACE ID / TOUCH ID
Biyometrik kilit ile hızlı erişim.

✦ ANLIK METRİKLER
Sorgu sayısı, cache hit oranı, ortalama latency, açık bildirim sayısı.

✦ KAYITLI SORGULAR
Başarılı sorgular otomatik cache'lenir. Tek tıkla tekrar çalıştır.

✦ ŞEMA AÇIKLAMALARI
Müşteri-özgü tablo / kolon notları. AI bunları SQL üretirken kullanır.

✦ WATCHLISTS
Eşik tabanlı izleme. "Stok < 10 olursa uyar" gibi.

✦ PLANLI RAPORLAR
Otomatik email raporlar. Saatlik, günlük 06:00, haftalık Pazartesi, aylık 1.gün.

✦ ŞEMA ANALİZİ
Sorgulardan otomatik öğrenilen JOIN ilişkileri + profile dışı tablolar.

✦ AKTİVİTE LOGU
Tüm tenant aktiviteleri kayıt altında. Audit trail.

✦ TÜRKÇE OPTIMIZE
İstanbul / İSTANBUL / istanbul / istambul — fuzzy matching, typo toleransı.

—

KİMLER İÇİN?
• Mağaza zinciri yöneticileri
• Üretim firmaları (planlama, kalite)
• Toptan ticaret (stok, sipariş)
• E-ticaret (satış analizi)
• Restoran zincirleri (ciro, malzeme)

DESTEKLENEN ERP'LER:
• Nebim V3 (MS SQL)
• SAP (PostgreSQL/Oracle adapter)
• Dynamics 365
• Logo, Mikro
• Odoo
• Custom PostgreSQL / MS SQL

—

KVKK uyumlu. Verileriniz sadece sizin ERP'nizden okunur, üçüncü taraflara satılmaz.

İletişim: support@erpaio.com
Privacy: erpaio.com/privacy
Terms: erpaio.com/terms
```

**EN:**

```
ERPAIO — ERP Query Assistant

Query your ERP database (Nebim V3, SAP, Dynamics 365, Logo, Mikro, PostgreSQL/Odoo) in natural Turkish. AI generates SQL, interprets results.

[... TR ile aynı yapı, İngilizce ...]
```

---

## Keywords (100 char, comma-separated)

**TR:**
```
ERP,SQL,Türkçe,AI,yapay zeka,Nebim,SAP,Logo,Mikro,sorgu,bildirim,WhatsApp,anomaly,raporlama
```

**EN:**
```
ERP,SQL,Turkish,AI,database,query,Nebim,SAP,Logo,Mikro,notification,WhatsApp,anomaly,reporting
```

---

## URLs

- **Support URL:** https://erpaio.vercel.app/help
- **Marketing URL:** https://erpaio.vercel.app
- **Privacy Policy URL:** https://erpaio.vercel.app/privacy

> Custom domain (`erpaio.com`) alındıktan sonra güncellenecek.

---

## Categories

- **Primary:** Business
- **Secondary:** Productivity

---

## Age Rating

- **4+** (içerik yok)
- Unrestricted Web Access: **No**

---

## Screenshot Plan (6.5" iPhone)

1. **Login** — "Hesabına devam et" temiz tasarım
2. **Karşılama** — "Merhaba [isim], size nasıl yardımcı olabilirim?" Playfair
3. **Chat** — Türkçe soru + SQL + tablo sonucu
4. **Bildirimler** — Severity'li alert listesi
5. **Sohbetlerim** — Pin/Archive ile düzenli liste
6. **Menü** — 10 sayfa grouplanmış (Günlük/Kurulum/Analiz)
7. **Ayarlar** — Section'lar (Profil, Bildirim, Güvenlik)

iPad screenshot opsiyonel — aynı ekranlar tablet boyutunda.

---

## Privacy Manifest Notes

iOS 17+ için ek bilgiler (App Store Connect'te):

**Data Linked to User:**
- Identifiers: User ID, Email
- Usage Data: Product Interaction
- Diagnostics: Crash Data, Performance Data

**Data Not Linked to User:**
- Diagnostics (anonimleştirilmiş)

**Tracking:** No (kullanıcıyı 3. taraf platformlarda takip etmiyor)

**Used for:**
- App Functionality (auth, queries)
- Analytics (anonymous performance)
- Developer Communications (notifications)

---

## App Review Information

**Demo Account:**
- Email: `demo@erpaio.com` (yeni oluştur, demo data ile)
- Password: `Demo1234!`
- ERP bağlantısı: Neon demo Postgres (zaten var)

**Contact Email:** support@erpaio.com
**Contact Phone:** [senin numaran]

**Notes for Reviewer:**
> ERPAIO connects to user's ERP database (provided by user via Settings).
> Demo account has a connection to a sample PostgreSQL database with 800
> customers, 12 stores, 3000 sales records. Try queries like:
> - "Bu ay toplam ciro?"
> - "En çok satan 5 ürün"
> - "İstanbul mağazalarındaki kritik stok"
