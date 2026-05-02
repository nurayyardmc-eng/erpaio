# ERPAIO Desktop (Tauri)

Native desktop wrapper around the web app — Mac (Universal: Intel + Apple Silicon)
and Windows (x86_64). ~10MB binary, Rust backend, Chromium-free WebView.

## Why Tauri (not Electron)

| | Tauri | Electron |
|---|---|---|
| Binary size | ~10MB | ~150-200MB |
| Memory | ~50-100MB | ~300-500MB |
| Backend | Rust | Node.js |
| WebView | Native (WKWebView/WebView2) | Bundled Chromium |
| Security | Sandboxed by default | Permissive |

For ERPAIO we just need a "shell" around `https://erpaio.vercel.app` —
Tauri is overwhelmingly the right choice.

---

## İlk kurulum (one-time)

### 1) Rust toolchain
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # >= 1.75
```

### 2) Tauri sistemleri
**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools (C++ build tools)
- Microsoft Edge WebView2 (genelde önyüklü)

**Linux (Ubuntu):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 3) Tauri CLI
```bash
cd ~/erpaio/desktop
npm install
```

---

## Geliştirme

```bash
cd ~/erpaio/desktop
npm run tauri dev
```

Yeni bir pencere açar, içinde `https://erpaio.vercel.app` çalışır.
DevTools: `Cmd+Option+I` (Mac) / `F12` (Windows).

## Production binary üretmek

```bash
cd ~/erpaio/desktop
npm run tauri build
```

Çıktılar:
- macOS: `src-tauri/target/release/bundle/macos/ERPAIO.app` (Universal binary)
  + `src-tauri/target/release/bundle/dmg/ERPAIO_1.0.0_universal.dmg`
- Windows: `src-tauri/target/release/bundle/msi/ERPAIO_1.0.0_x64_en-US.msi`
  + `.../bundle/nsis/ERPAIO_1.0.0_x64-setup.exe`
- Linux: `.deb` + `.AppImage`

**Code signing** (Mac App Store / Windows Store dağıtımı için Faza 13.1):
- macOS: Apple Developer ID Application sertifikası gerekli
- Windows: EV Code Signing sertifikası ($300+/yıl) — opsiyonel ama önerilen

---

## Yapı

```
desktop/
├── package.json            # Tauri CLI + scripts
├── src-tauri/
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # window config, bundle settings
│   ├── build.rs
│   ├── icons/              # 32x32, 128x128, .ico, .icns
│   └── src/
│       └── main.rs         # Rust entry — sadece pencere açar
└── README.md (this)
```

---

## Auto-update (Faza 13.2)

Tauri Updater özelliği: kullanıcı yeni sürüm çıkınca otomatik indirip kurar.

`tauri.conf.json` içinde:
```json
"updater": {
  "active": true,
  "endpoints": ["https://erpaio.vercel.app/api/updates/{{target}}/{{current_version}}"],
  "pubkey": "..."
}
```

Backend'e `/api/updates/[platform]/[version]` endpoint'i eklenir, version
karşılaştırıp .dmg/.msi URL döner. Şu an iskelet, post-pilot.

---

## Ek özellikler (post-pilot)

- [ ] **System tray icon** — uygulama menü çubuğunda kalsın, alert pop'lasın
- [ ] **Native notifications** — alert geldiğinde OS notification (macOS Notification Center, Windows toast)
- [ ] **Keyboard shortcuts** — Cmd+K → chat'e atla, Cmd+, → settings
- [ ] **Auto-launch on login** — opsiyonel
- [ ] **Sidebar app** — pencere değil, edge'e gizlenebilir panel
- [ ] **Offline mode** — son query cache'i Tauri'nin SQLite'ında

---

## Faza 13 sonrası: yayın

**Mac:**
- TestFlight benzeri dağıtım: GitHub Releases üstünden `.dmg`
- Mac App Store: Apple Developer Program + sandbox uyumu (~1 hafta efor)

**Windows:**
- Microsoft Store: Partner Center'da kayıt + signed `.msix` (~$25, opsiyonel)
- Standalone: GitHub Releases üstünden signed `.msi` / `.exe`
