# ERPAIO On-Prem Agent

Müşteri sunucusunda çalışan, ERPAIO Cloud'a (`wss://erpaio.vercel.app/api/agent/ws`)
WebSocket üzerinden bağlanan, gelen SQL'leri lokal MSSQL'de çalıştıran ve sonucu
geri yollayan ufak bir Go binary.

**Açık kaynak** — müşterinin güvenlik ekibi inceleyebilir, build edebilir,
denetleyebilir. ERPAIO'nun **brain'i** (prompt mühendisliği, AI logic, profile
bilgisi) Cloud'da kapalı kalır — agent sadece SQL execute eder.

## Mimari

```
Müşteri Cihazı                              ERPAIO Cloud
─────────────                               ───────────
[Mobile / Web]
      ↓
[Cloud API] ←──── wss (mTLS) ────→  [Agent Service @ customer]
                                              ↓ tcp/1433
                                          [MSSQL]
```

## Faza 10.6 / Y3 — Şu anki durum: skeleton

Bu klasör agent'ın **iskelet kodunu** içeriyor. Üretim build'i için
3-4 günlük ek geliştirme gerekir (mTLS auth, auto-update, multi-platform packaging).

## Build

```bash
cd ~/erpaio/agent
go mod download
go build -o erpaio-agent ./cmd/erpaio-agent
./erpaio-agent --help
```

## Configure

```bash
./erpaio-agent register \
  --tenant=tenant_xxx \
  --token=erpaio_agent_xxx... \
  --db-host=localhost \
  --db-port=1433 \
  --db-name=NebimDB \
  --db-user=erpaio_readonly \
  --db-password='...' \
  --cloud=wss://erpaio.vercel.app/api/agent/ws
```

Config `~/.erpaio-agent/config.yaml` dosyasına yazılır.

## Run

```bash
./erpaio-agent run
# veya systemd:
sudo ./erpaio-agent install-service
sudo systemctl start erpaio-agent
```

## Güvenlik

- Tüm trafik mTLS (Cloud Cert Authority + Agent client cert)
- DB credential lokal AES-256-GCM ile encrypted
- Cloud'dan gelen SQL **lokal** validator'dan da geçer (defense in depth):
  SELECT/WITH whitelist + DROP/UPDATE/EXEC denied
- Audit log lokal SQLite'ta, müşteri istediği zaman okuyabilir
- Auto-update sadece signed Ed25519 binary'lerini kabul eder

## Yapı

```
agent/
├── README.md (this)
├── go.mod
├── cmd/erpaio-agent/main.go     # CLI entry
└── internal/
    ├── config/                   # config dosyası, env, validation
    ├── connection/               # WebSocket cloud bağlantısı + reconnect
    ├── executor/                 # mssql query execution + timeout
    ├── validator/                # local SQL whitelist (defense in depth)
    ├── audit/                    # SQLite audit log
    ├── update/                   # signed binary auto-update
    └── service/                  # systemd / launchd / Windows Service
```

## Faza 10.6 deliverable plan (3-4 gün, müşteri talep ederse)

- [ ] gorilla/websocket reconnect loop
- [ ] mssql driver wrapper (timeout, cancellation)
- [ ] SQL whitelist validator (TS Faza 7.5'tekinin Go portu)
- [ ] SQLite audit (gorm)
- [ ] systemd unit dosyası (Linux), launchd plist (macOS), Windows Service (sc.exe)
- [ ] GitHub Actions ile signed multi-platform release (linux/darwin/windows × amd64/arm64)
- [ ] Auto-update endpoint (`/api/agent/latest/<platform>/version` cloud'da)
- [ ] Config CLI (register/run/uninstall/status)
- [ ] mTLS cert generation + rotation flow
