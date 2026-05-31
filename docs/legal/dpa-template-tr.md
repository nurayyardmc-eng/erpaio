# Veri İşleme Sözleşmesi (DPA) — ŞABLON

**Bu dosya bir taslaktır. Yasal bağlayıcı versiyon için bir avukatla gözden geçirilmelidir.**
Versiyon: v1.0-draft · Son güncelleme: 2026-05-31

---

## 0. Taraflar

- **Veri Sorumlusu** ("Müşteri"): bu sözleşmeye taraf olan tüzel kişi.
- **Veri İşleyen** ("ERPAIO"): bu hizmeti sunan tüzel kişi.

Müşteri, KVKK md. 3/ı ve GDPR Art. 4(7) anlamında **veri sorumlusudur**; ERPAIO, KVKK md. 3/ğ ve GDPR Art. 4(8) anlamında **veri işleyendir**.

## 1. Konu ve süre

ERPAIO; Müşterinin Türkçe doğal dil arayüzü üzerinden kendi ERP veritabanına sorgu yapmasını, anomaly tespiti ve bildirim almasını sağlayan bir SaaS hizmeti sunar. Bu DPA, ana hizmet sözleşmesinin (Master Service Agreement) eki olarak Müşteri ile ERPAIO arasındaki kişisel veri işleme ilişkisini düzenler.

Sözleşme süresi, ana hizmet sözleşmesinin süresi ile aynıdır. Müşteri verilerinin silinmesi/iadesi madde 9'da düzenlenmiştir.

## 2. İşlenen veri kategorileri

Müşterinin hizmet üzerinden ERPAIO'ya aktardığı veriler:

- **Hesap verisi:** kullanıcıların adı, e-postası, hashlenmiş şifresi, oturum tokenları, MFA secret'ı.
- **ERP bağlantı verisi:** host, port, veritabanı adı, kullanıcı adı, **AES-256-GCM ile şifrelenmiş** parola.
- **Sorgu içeriği:** Müşteri tarafından gönderilen doğal dil soruları, üretilen SQL, sonuçların ilk 100 satırı (önbellek için).
- **Aktivite kayıtları:** giriş/çıkış zamanları, IP adresleri, user-agent, hesap işlem logları.
- **Bildirim metadata'sı:** WhatsApp/email/Slack/Teams gönderim sonuçları, alıcı bilgisi.

Özel nitelikli kişisel veri (sağlık, biyometri, mahkumiyet vb.) toplanmaz; Müşterinin ERP verisi içerirse, o veri Müşterinin sorumluluğundadır.

## 3. İşleme amacı ve hukuki dayanak

ERPAIO, kişisel verileri yalnızca Müşterinin **yazılı talimatı doğrultusunda** ve aşağıdaki amaçlarla işler:

- Hizmetin sözleşme kapsamında sunulması.
- Hizmetin güvenliğinin, kullanılabilirliğinin ve kalitesinin sağlanması.
- Faturalandırma, müşteri desteği ve yasal yükümlülüklerin yerine getirilmesi.

ERPAIO, verileri kendi pazarlama, satış veya profilleme amacıyla **işlemez**.

## 4. Veri işleyenin yükümlülükleri

ERPAIO aşağıdakileri taahhüt eder:

1. Verileri yalnızca bu DPA ve Müşterinin yazılı talimatları doğrultusunda işlemek.
2. Verilere erişen tüm personelin yazılı **gizlilik taahhütü** vermesini sağlamak.
3. Madde 7'de belirtilen teknik ve organizasyonel önlemleri uygulamak.
4. Madde 5'teki koşullar dışında alt-işleyici (sub-processor) görevlendirmemek.
5. Müşterinin veri sahiplerinin (data subjects) haklarını kullanmasına makul ölçüde yardım etmek (silme, erişim, taşınabilirlik). ERPAIO; hesap silme, veri export ve consent log API'leri sağlar.
6. Veri ihlali (data breach) durumunda **72 saat içinde** Müşteriye bildirimde bulunmak (GDPR Art. 33).
7. Talep edilmesi halinde KVKK Kurulu veya GDPR denetim otoritesinin denetimine, makul süre içinde işbirliği yapmak (md. 12/2-a).

## 5. Alt-işleyiciler (sub-processors)

ERPAIO, aşağıdaki üçüncü taraf hizmet sağlayıcılarını mevcut alt-işleyici olarak kullanır. Müşteri, bu DPA'yı imzalamakla bu listeyi onayladığını kabul eder.

| Hizmet | Konum | Amaç |
|---|---|---|
| **Vercel, Inc.** | ABD (EU/US DPA + SCC) | Uygulama hosting (Next.js) |
| **Supabase, Inc.** | EU (Frankfurt) | Postgres veritabanı |
| **Anthropic, PBC** | ABD (US DPA) | Claude AI sorgu üretimi |
| **Twilio, Inc.** | ABD (US DPA + SCC) | WhatsApp bildirim |
| **Resend, Inc.** | ABD (US DPA) | Email bildirim |
| **Upstash, Inc.** | EU (Frankfurt) | Redis rate-limit |
| **Sentry (Functional Software, Inc.)** | ABD (US DPA + SCC) | Hata raporlama |
| **Stripe, Inc.** | İrlanda + ABD | Global ödeme (TR dışı) |
| **iyzico Ödeme Hizmetleri A.Ş.** | Türkiye | TR ödeme |
| **GitHub, Inc.** | ABD (US DPA) | CI/CD ve zamanlanmış görevler |

ERPAIO yeni bir alt-işleyici ekleme öncesinde Müşteriye **en az 14 gün önceden** e-posta ile bildirimde bulunur. Müşteri, bu süre içinde itirazda bulunabilir; itiraz çözülmezse Müşteri sözleşmeyi feshetme hakkına sahiptir.

## 6. Uluslararası veri transferi

Bazı alt-işleyiciler verileri ABD'de işlemektedir. Bu transferler:

- **GDPR Art. 46(2)(c):** AB Komisyonu Standart Sözleşme Maddeleri (SCC, 2021/914) ile,
- **KVKK md. 9:** ilgili kişinin açık rızası veya Kurul tarafından yeterli koruma sağlandığına dair karar bekleniyor; bu dönem için açık rıza temelinde işlenir.

ERPAIO, kullanım dilinde Müşteriden açık rıza alır (signup KVKK onayı `consent_log` tablosunda audit edilir).

## 7. Teknik ve organizasyonel önlemler (Annex II)

**Şifreleme:**
- ERP bağlantı parolaları: **AES-256-GCM**, anahtar rotasyonu desteklenir.
- Bekleme verisi: Supabase varsayılan disk şifrelemesi (AES-256).
- İletim verisi: TLS 1.2+ (HTTPS), HSTS aktif.
- Kullanıcı şifreleri: bcrypt cost factor 12.

**Erişim kontrolü:**
- Multi-tenant izolasyon: her sorgu `tenantId` ile boundary'lenir; tenant cross-contamination önlenir.
- Role-based access: `owner` / `member` / `sysadmin` rolleri.
- MFA: TOTP destekli, sysadmin için zorunlu.
- Read-only ERP koruması: 50+ test ile SELECT-only validator.

**Ağ güvenliği:**
- Vercel edge proxy, DDoS koruması.
- Rate limiting: Upstash Redis backed; her endpoint için cap.
- Bot/scraper koruması: Sentry + custom anomaly detection.

**Loglama ve denetim:**
- ActivityLog: tüm kullanıcı aksiyonları (login, profile change, MFA, vb.).
- ConsentLog: KVKK consent grant/withdraw audit (append-only, retention 2+ yıl).
- Cron job audit: tüm zamanlanmış görevlerin başarı/hata durumu.

**İş sürekliliği:**
- Haftalık otomatik DB yedeklemesi (pg_dump, 30 gün retention).
- Health endpoint (`/api/health`) ile real-time uptime izleme.
- Sentry ile hata bildirimi (P1 olaylar için anlık).

**İncident response:**
- Veri ihlali tespitinde **72 saat içinde** Müşteriye bildirim.
- Açıklama, etki analizi ve azaltma adımları yazılı raporda paylaşılır.

## 8. Veri sahibi (data subject) hakları

Müşteri, ERPAIO'nun hizmet üzerinden veri sahiplerinin aşağıdaki haklarını kullanmasına imkan tanıdığını teyit eder:

- **Erişim/taşınabilirlik:** `/dashboard/settings → Veri export` ile JSON formatında tüm veriler indirilebilir.
- **Silme:** `/dashboard/settings → DangerZone → Hesabı sil` cascade ile tüm ilişkili verileri siler; ActivityLog ve ConsentLog audit için saklı kalır (SetNull).
- **Düzeltme:** Profil sayfasından doğrudan düzenleme.
- **İşlemenin sınırlandırılması:** Müşteri talebi üzerine destek ekibi tarafından.

## 9. Sözleşme sonu

Sözleşmenin herhangi bir sebeple sona ermesi halinde Müşteri, **30 gün içinde** Müşteri verilerinin:

- (a) tam bir export'unu (JSON+JSONL) indirebilir,
- (b) silinmesini talep edebilir.

ERPAIO, 30 günlük geçiş süresinin sonunda Müşteri verilerini **kalıcı olarak siler** (DB cascade + yedeklerin otomatik retention süresinin dolması; en geç 60 gün içinde tüm kopyalar). Audit log'ları (ActivityLog, ConsentLog) yasal gereklilik (TTK + KVKK retention) sebebiyle 2 yıl saklanır.

## 10. Sorumluluk ve denetim

Müşteri, talep ederse yılda **bir defaya** mahsus olmak üzere ERPAIO'nun bu DPA'ya uyumunu denetleme hakkına sahiptir. Denetim, en az 30 gün önceden yazılı bildirimle, Müşterinin masrafları kendisine ait olmak üzere, çalışma saatleri içinde, hizmetin işleyişini bozmayacak şekilde gerçekleştirilir.

ERPAIO; ISO 27001 veya SOC 2 sertifikası aldığında, Müşteri bu raporları denetim yerine kabul edebilir.

## 11. Diğer hükümler

- Bu DPA, ana hizmet sözleşmesinin ayrılmaz bir parçasıdır. Çelişki halinde bu DPA önceliklidir.
- Uygulanacak hukuk: Türkiye Cumhuriyeti hukuku.
- Yetkili mahkeme: İstanbul Merkez (Çağlayan) Mahkemeleri.

---

**İmzalar**

Müşteri (Veri Sorumlusu):
- Tarih: ________________
- Ad/Soyad: ________________
- Unvan: ________________
- İmza: ________________

ERPAIO (Veri İşleyen):
- Tarih: ________________
- Yetkili: ________________
- İmza: ________________

---

**İletişim**

KVKK Veri Sorumlusu İrtibat Kişisi (VERBİS): _şirket bilgileri eklenecek_
Veri ihlali bildirim: privacy@erpaio.com _(domain alınınca aktive_)
Genel destek: support@erpaio.com
