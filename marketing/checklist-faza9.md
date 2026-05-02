# Faza 9 — Yayın Checklist

Mobile uygulamayı App Store + Play Store'a sunma süreci. Sıralı checklist —
seninle benim payımı net ayırdım.

---

## ✓ Bende — kod, metin, config

- [x] `/privacy` sayfası — KVKK + GDPR uyumlu metin (Türkçe)
- [x] `/terms` sayfası — kullanım koşulları
- [x] Mobile SettingsScreen'de gizlilik/koşullar/destek linkleri
- [x] Türkçe store listing (`marketing/store-listings/tr.md`)
- [x] English store listing (`marketing/store-listings/en.md`)
- [x] Data safety disclosure (`marketing/store-listings/data-safety.md`)
- [x] Mobile bundle ID: `com.nurayyardmc.erpaio`
- [x] EAS Build profiles (development, preview, production)
- [x] Push notification plugin yapılandırması
- [x] App icon + splash + adaptive icon (Expo template — Faza 9'da değiştir)

## ⚠ Sizde — hesap, ödeme, başvuru

### 1) Apple Developer Program kaydı
- [ ] https://developer.apple.com/programs/ → enroll
- [ ] $99/yıl, kredi kartı + DUNS number (şirket için) veya kişisel
- [ ] App Store Connect erişimi geldiğinde (1-2 gün)
- [ ] Bundle ID rezerve et: **com.nurayyardmc.erpaio**
- [ ] App Store Connect → New App → ERPAIO

### 2) Google Play Console kaydı
- [ ] https://play.google.com/console → register
- [ ] $25 tek seferlik
- [ ] D-U-N-S number gerekmez (developer hesabı yeterli)
- [ ] Geliştirici doğrulaması (telefon + ID — Türkiye'den olabilir)
- [ ] Yeni uygulama: **ERPAIO**, package: **com.nurayyardmc.erpaio**

### 3) EAS Build ile production binary üret
```bash
cd ~/erpaio/mobile
npm install -g eas-cli
eas login
eas init
# app.json'da extra.eas.projectId otomatik dolar
eas build --profile production --platform ios
eas build --profile production --platform android
```
- [ ] iOS build → `.ipa` dosyası (App Store Connect'e otomatik upload)
- [ ] Android build → `.aab` dosyası (Play Console'a otomatik upload)

### 4) Marketing assets (görseller)
**Bunları kendi cihazınla çek:**

**App icon (1024×1024 PNG, alpha kanalı YOK):**
- [ ] Şu anki Expo template icon yerine ERPAIO branded icon (cyan #00E5FF text on dark #07090F bg)
- [ ] Designer hire / Figma / Canva ile hazırla — ya da bana SVG iste, oluşturayım
- [ ] `mobile/assets/icon.png`'yi değiştir, EAS yeniden build et

**Screenshots (App Store):**
- [ ] iPhone 6.5" (iPhone 14 Pro Max) — 5-10 adet, 1290×2796px
- [ ] iPhone 5.5" (iPhone 8 Plus) — opsiyonel, 1242×2208px
- [ ] iPad 12.9" — opsiyonel
- Önerim: **5 ekran** — Login, Sessions list, Chat with results, Alerts, Settings

**Screenshots (Play Store):**
- [ ] Phone — min 2, max 8 adet (1080×1920px+)
- [ ] 7" tablet — opsiyonel
- [ ] 10" tablet — opsiyonel
- [ ] Feature graphic: 1024×500px (Play store header görseli)

### 5) Apple App Privacy + Google Data Safety formları
- [ ] App Store Connect → App Privacy → `marketing/store-listings/data-safety.md`'deki Apple bölümünü doldur
- [ ] Play Console → Data Safety → aynı belgenin Google bölümünü doldur

### 6) Listing metinlerini gir
Apple App Store Connect:
- [ ] Description (Türkçe + English) — `tr.md` + `en.md`'den kopyala
- [ ] Keywords, Subtitle, Promotional Text
- [ ] Support URL, Marketing URL, Privacy Policy URL

Google Play Console:
- [ ] Short description, Full description (Türkçe + English)
- [ ] Privacy Policy URL: https://erpaio.vercel.app/privacy
- [ ] Contact details

### 7) İlk submit
- [ ] App Store: TestFlight'a göndermeden direkt App Review'a sun (1.0.0 sürümü)
- [ ] Play Store: Internal testing track'inde 14 gün test → Closed → Production
- [ ] **Apple inceleme: 24-48 saat (genellikle).** Reddedilirse mail gelir, yorum okunup düzeltilir.
- [ ] **Google inceleme: 1-7 gün** (yeni hesaplarda 7 günü bulabilir, ilk yayın için sabırlı ol).

### 8) Yayın sonrası
- [ ] App Store sonuç → reviews + crash reports izle
- [ ] Play Console → vitals + ANR rate izle
- [ ] Sentry'de mobile crash'leri ayır (release tag: `1.0.0`)
- [ ] Plan: 2-4 hafta içinde ilk patch (1.0.1) — feedback'le

---

## Emin değilsen şu adımları benimle birlikte yap

1. **EAS Build çıktısı** alındıktan sonra `.ipa`/`.aab`'yi ya senin Mac'inde yükleriz ya birlikte App Store Connect'te submit ederiz. Bana **ekran paylaşımı** üzerinden rehberlik edebilirim.
2. **Reddedilme** durumunda: Apple/Google'ın geri bildirimini bana yapıştır, beraber yorumlayıp 1-2 saatte düzeltiriz.
3. **App icon** için: bana hangi tarz istediğini söyle (minimal, full logo, sadece harf, animasyonlu vb.), ben SVG/Figma'da bir taslak hazırlarım, EAS'a injecte ederim.

---

## Hesap maliyetleri özeti

| Kalem | Tutar | Sıklık |
|---|---|---|
| Apple Developer Program | $99 | Yıllık |
| Google Play Developer | $25 | Tek seferlik |
| **Toplam ilk yıl** | **~$124 (~₺4,300)** | |
