# Data Safety / App Privacy Disclosure

İki store da uygulamanın hangi verileri topladığını sorar — bu doğru cevaplar.

---

## Apple App Privacy ("App Privacy" sekmesi)

### Data Used to Track You
**Hiçbiri** — third-party tracking yapmıyoruz.

### Data Linked to You

**Contact Info**
- ☑ Email Address — App Functionality

**User Content**
- ☑ Other User Content (chat queries, feedback) — App Functionality, Product Personalization

**Identifiers**
- ☑ User ID (tenant/user ID) — App Functionality
- ☑ Device ID (push token) — App Functionality

**Usage Data**
- ☑ Product Interaction (which screens, when) — App Functionality, Analytics

**Diagnostics**
- ☑ Crash Data — App Functionality (Sentry)
- ☑ Performance Data — App Functionality (Sentry)
- ☑ Other Diagnostic Data (request IDs, logs) — App Functionality

### Data Not Linked to You
**Hiçbiri**

---

## Google Play Data Safety

### Data collection

**Personal info**
- ☑ Name (optional) — App functionality
- ☑ Email address — Account management, App functionality

**Financial info**
- Hayır — finansal veri toplamıyoruz, ödeme Stripe/iyzico üstünden olacak

**Health and fitness**
- Hayır

**Messages**
- ☑ Other in-app messages (chat queries, SQL results) — App functionality

**Photos and videos**
- Hayır

**Audio files**
- Hayır

**Files and docs**
- Hayır

**Calendar / Contacts**
- Hayır

**App activity**
- ☑ App interactions — Analytics, App functionality
- ☑ In-app search history (sohbet geçmişi) — App functionality
- ☑ Other user-generated content (feedback) — App functionality, Product personalization

**Web browsing**
- Hayır

**App info and performance**
- ☑ Crash logs — App functionality
- ☑ Diagnostics — App functionality, Analytics
- ☑ Other app performance data — App functionality

**Device or other IDs**
- ☑ Device or other IDs (push notification token) — App functionality

### Security practices

- ☑ Data is encrypted in transit (HTTPS)
- ☑ Data is encrypted at rest (Postgres + AES-256-GCM for ERP creds)
- ☑ Users can request data deletion (privacy@erpaio.com)
- ☑ Committed to Google Play Families Policy: hayır (B2B uygulama, çocuklara değil)

### Data shared with third parties?
**Yes, with these services:**
- Anthropic (Claude AI) — chat queries için
- Vercel — hosting
- Supabase — database hosting (encrypted)
- Sentry — crash + performance (sensitive data scrubbed)
- Twilio — WhatsApp delivery
- Expo — push notification relay

Hiçbiri **veri satışı** için kullanılmıyor — sadece hizmet sunumu.
