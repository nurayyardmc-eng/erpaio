# ERPAIO Mobile

React Native (Expo SDK 54) mobile client for ERPAIO. Backend: https://erpaio.vercel.app

## Geliştirme

```bash
cd mobile
npm install
npx expo start
```

QR kodu **Expo Go** uygulamasıyla okut (App Store / Play Store'da var).

API URL'i değiştirmek için (örn. local backend):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.22:3000 npx expo start
```

## EAS Build (development binary)

İlk kurulum:

```bash
npm install -g eas-cli
eas login
cd mobile
eas init                                    # projectId üretir, app.json'a yazar
eas build --profile development --platform ios     # iOS dev binary
eas build --profile development --platform android # Android dev binary
```

Çıkan binary'leri:
- iOS: TestFlight veya simulator (.app)
- Android: APK indir + cihaza yükle

## Push notifications

`registerForPush()` login sonrası otomatik çağrılır. Backend'in
`/api/me/push-token` endpoint'ine kayıt olur. Alert oluşunca Expo Push API
üzerinden cihaza düşer.

## Faza 9 — yayın

App Store + Play Store yayını için:

```bash
eas build --profile production --platform all
eas submit --profile production --platform all
```

Önkoşullar:
- Apple Developer hesabı ($99/yıl)
- Google Play Console hesabı ($25, tek seferlik)
- Bundle ID `com.nurayyardmc.erpaio` her iki store'da rezerve
- App icons (1024x1024), screenshots, ekran metinleri (Türkçe + İngilizce)

## Yapı

```
mobile/
├── App.tsx                    # Auth state + Navigation root
├── app.json                   # Expo config (icon/splash/bundle ID)
├── eas.json                   # Build profiles (dev/preview/production)
├── src/
│   ├── lib/
│   │   ├── api.ts             # fetch wrapper + Bearer token
│   │   ├── auth.ts            # login/logout/getMe
│   │   ├── chat.ts            # /api/chat helpers
│   │   ├── alerts.ts          # /api/alerts helpers
│   │   ├── tenant.ts          # /api/tenant helpers
│   │   ├── push.ts            # Expo Push token registration
│   │   └── theme.ts           # Dark theme tokens
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── SessionsScreen.tsx
│       ├── ChatScreen.tsx
│       ├── ChatStackNav.tsx
│       ├── AlertsScreen.tsx
│       └── SettingsScreen.tsx
└── assets/                    # icon.png, splash-icon.png, adaptive-icon.png
```
