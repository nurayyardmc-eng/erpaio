# ERPAIO On-Prem Agent

A small Go binary that runs on the customer's server, polls ERPAIO Cloud over
**outbound HTTPS** for SQL jobs, executes them against the local MSSQL (Nebim)
instance, and posts the results back. No inbound ports, no WebSocket.

**Open source** — the customer's security team can read, build, and audit it.
ERPAIO's "brain" (prompt engineering, AI logic, ERP profiles) stays in the
cloud; the agent only executes already-generated read-only SQL.

## Architecture

```
Customer server                         ERPAIO Cloud (Vercel)
───────────────                         ─────────────────────
[erpaio-agent] ──GET /api/agent/jobs/next──►  job queue (Postgres)
      │  validate (local) + run on MSSQL
      │  tcp/1433 → [MSSQL / Nebim]
      └──POST /api/agent/jobs/{id}/result──►  result written back
```

Why polling and not WebSocket: Vercel's serverless functions cannot hold a
persistent socket. The agent therefore drives everything with short outbound
HTTPS requests — which also means **no firewall changes** on the customer side.

## Security

- **Outbound only.** No inbound ports opened.
- **Bearer token over HTTPS.** Generated in the dashboard (Connections → "Set up
  agent"), shown once, stored hashed (SHA-256) in the cloud. Revoke any time.
- **Credentials stay local.** The MSSQL user/password live only in
  `~/.erpaio-agent/config.yaml` (mode 0600) — the cloud never stores them for
  agent-backed connections.
- **Defense in depth.** Every job is re-validated locally
  (`internal/validator`, a port of `src/lib/validators/sql.ts`): SELECT/WITH
  allowlist + DDL/DML/system-proc/comment/file blocklist. Non-reads are refused
  before they touch the DB.

## Build

> Requires the Go toolchain (1.22+). The first build fetches deps and creates
> `go.sum`:

```bash
cd agent
go mod tidy
go build -o erpaio-agent ./cmd/erpaio-agent
./erpaio-agent --help
```

## Configure

Generate a token in the dashboard, then:

```bash
./erpaio-agent register \
  --cloud=https://erpaio.vercel.app \
  --token=erpaio_xxx... \
  --db-host=localhost --db-port=1433 \
  --db-name=NebimDB --db-user=erpaio_readonly --db-password='...'
```

Config is written to `~/.erpaio-agent/config.yaml`.

## Run

```bash
./erpaio-agent run        # foreground
./erpaio-agent status     # show current config
```

## Layout

```
agent/
├── README.md (this)
├── go.mod
├── cmd/erpaio-agent/main.go     # CLI: register / run / status
└── internal/
    ├── config/      # ~/.erpaio-agent/config.yaml load/save + DSN
    ├── connection/  # outbound HTTPS poll loop (claim → execute → result)
    ├── executor/    # MSSQL query (database/sql + go-mssqldb), timeouts
    └── validator/   # local read-only SQL guard (+ tests)
```

## Roadmap (Phase 3 — on demand)

- Local SQLite audit log (every executed query, readable by the customer)
- Signed multi-platform releases + auto-update
- Service install (systemd / launchd / Windows Service)
- Token rotation + "agent offline" alerting
- Optional Postgres/Oracle/MySQL executors (MSSQL-first today)
