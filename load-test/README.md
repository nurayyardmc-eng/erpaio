# ERPAIO Load Testing

k6-based load tests for production capacity planning.

## Quick start

```bash
# Install k6 (one-time)
brew install k6              # macOS
# or: https://k6.io/docs/get-started/installation/

# Set env (use a test tenant with seeded data)
export K6_BASE_URL=https://erpaio.vercel.app
export K6_API_TOKEN=erpaio_xxx   # generate via /dashboard/security
export K6_CONNECTION_ID=ckxx     # active test connection

# Smoke (low load — sanity check)
k6 run --vus 1 --duration 30s scenarios/smoke.js

# Health endpoint only (no auth)
k6 run scenarios/health.js

# Authenticated chat-stream (heavy — costs API credits)
k6 run scenarios/chat-stream.js
```

## Scenarios

| File | Purpose | Cost | Auth |
|------|---------|------|------|
| `scenarios/health.js` | `/api/health` cold start + warm latency | Free | No |
| `scenarios/smoke.js` | Mix of public endpoints | Free | No |
| `scenarios/chat-stream.js` | Authenticated chat-stream sustained load | Anthropic tokens | API token |
| `scenarios/auth-endpoints.js` | Login/signup/reset brute-force protection | Free | No |

## Thresholds

Each scenario asserts:
- `http_req_failed` rate < 1%
- `http_req_duration` p(95) < 2s (cold start tolerant)
- `http_req_duration` p(99) < 5s

If thresholds fail, the run exits non-zero — CI integration possible.

## What we're measuring

1. **Cold start time**: Vercel serverless first-hit latency
2. **Sustained throughput**: stable RPS the platform can serve
3. **Rate limit behavior**: 429 response correctness under burst
4. **DB connection pool**: pgbouncer behavior during concurrency
5. **Anthropic API ceiling**: where we hit 50 RPM Sonnet limit

## NOT included (yet)

- Distributed multi-region load (k6 cloud — paid)
- WebSocket / SSE long-running streams beyond 60s
- Soak test (1+ hours) — quota concerns
