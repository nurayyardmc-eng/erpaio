# ERPAIO Operations Runbook

Production ops playbook — deployment, backup, disaster recovery, and routine procedures.

---

## 1. Deployment

### Automatic (default path)

1. Merge to `main` branch → Vercel auto-deploy (preview becomes production after CI passes).
2. CI workflow (`.github/workflows/ci.yml`) runs:
   - `npm test` (vitest, 234 tests, ~2 sec)
   - `npx tsc --noEmit` (web)
   - `npx eslint . --max-warnings=0`
   - `next build` with placeholder env
   - Mobile `tsc --noEmit` (separate job, mobile/ workspace)
3. Vercel runs production build with real env vars and migrations:
   - `prisma generate` (auto via package.json `build` script)
   - **Prisma migrations**: run on first request via Vercel cold start, OR manually with `npx prisma migrate deploy` from local machine pointing at production DATABASE_URL.

### Manual deploy

```bash
# From /Users/nurayyardimci/erpaio
vercel --prod --yes
```

Hobby plan limit: 100 deploys/day. Bunch commits when possible.

### Rollback

1. Vercel dashboard → Deployments → previous successful deploy → "Promote to Production".
2. **DB migrations cannot be auto-rolled back.** If a migration broke things:
   - Roll forward with a new migration that undoes the change
   - Or restore from Supabase backup (see § 3)

---

## 2. Environment variables

Required (server crashes on boot if missing — validated by `instrumentation.ts`):

| Name                  | Format            | Source                            |
| --------------------- | ----------------- | --------------------------------- |
| `DATABASE_URL`        | postgresql://     | Supabase pooled (6543)            |
| `DIRECT_URL`          | postgresql://     | Supabase direct (5432, migrations)|
| `NEXTAUTH_SECRET`     | ≥16 chars         | Generate `openssl rand -hex 32`   |
| `ENCRYPTION_KEY`      | 64-char hex       | `openssl rand -hex 32`            |
| `ANTHROPIC_API_KEY`   | `sk-ant-...`      | console.anthropic.com             |
| `CRON_SECRET`         | ≥16 chars         | `openssl rand -hex 32`            |

Recommended (warns but doesn't crash):

| Name                            | Service           |
| ------------------------------- | ----------------- |
| `RESEND_API_KEY`, `RESEND_FROM` | Email             |
| `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`WHATSAPP_FROM` | WhatsApp |
| `UPSTASH_REDIS_REST_URL`/`TOKEN`| Rate limit (fallback: in-memory) |
| `SENTRY_DSN`                    | Error tracking    |
| `STRIPE_SECRET_KEY`/`WEBHOOK_SECRET` | Billing      |

---

## 3. Database backup strategy

### Automatic (Supabase)

- **Free tier**: daily backups, 7-day retention (Supabase manages).
- **Pro tier**: PITR (point-in-time recovery) available.
- Verify: Supabase dashboard → Settings → Database → Backups.

### Manual export

```bash
# Schema + data dump
pg_dump $DIRECT_URL --no-owner --no-acl > erpaio-backup-$(date +%Y%m%d).sql

# Restore (CAREFUL — overwrites)
psql $DIRECT_URL < erpaio-backup-YYYYMMDD.sql
```

### KVKK/GDPR data retention

Per `src/app/api/cron/cleanup/route.ts` retention policies:

| Table                       | Retention                | Reasoning                          |
| --------------------------- | ------------------------ | ---------------------------------- |
| `ProcessedWebhook`          | 30 days                  | Stripe retry window + margin       |
| `CronRun`                   | 90 days                  | Health dashboard history           |
| `PasswordResetToken`        | 7 days (expired)         | Token only 1h valid                |
| `EmailVerificationToken`    | 30 days (expired)        | Token only 24h valid               |
| `Alert` (resolved/acked)    | 180 days                 | Open alerts kept indefinitely      |
| `NotificationLog`           | 180 days                 | Synced with alert retention        |
| `ConsentLog`                | **PERMANENT**            | KVKK md. 7 + 11 audit trail        |
| `ActivityLog`               | **≥ 2 years (manual)**   | KVKK md. 13 işleme faaliyeti       |
| `MfaRecoveryCode` (used)    | User cascade             | Auto-cleaned on user delete        |

Cleanup cron runs daily 04:00 UTC.

---

## 4. Disaster recovery scenarios

### "All AI queries failing — Anthropic outage"

1. Check status: https://status.anthropic.com
2. App falls back gracefully (chat returns error, user can retry).
3. No action needed unless prolonged — consider setting `MAINTENANCE_MODE=true` env var (see § 6).

### "DB connection pool exhausted"

Symptoms: `/api/health` returns 503, slow requests, "too many connections" errors.

1. Check Supabase dashboard → Settings → Database → Pooler status.
2. Restart Vercel deployment (Vercel UI → redeploy current).
3. If persistent: check `src/lib/db/connector.ts` ERP pool eviction (MAX_POOLS=50, idle 10min). Reduce if needed.

### "Cron jobs stopped running"

1. Check `/admin/cron-runs` — is anything in `RUNNING` status > 10 min? That's a stale lock.
2. Manual unlock: sysadmin can manually update the row:
   ```sql
   UPDATE "CronRun" SET status = 'FAILED', "finishedAt" = NOW()
   WHERE "jobName" = 'anomaly-detection-hourly' AND status = 'RUNNING';
   ```
3. Cron not firing at all? Check GitHub Actions workflow logs:
   - `.github/workflows/{anomaly-hourly,trial-warnings-daily,scheduled-reports-daily,watchlists-hourly,cleanup-daily}.yml`
   - Verify `CRON_SECRET` is set in repo secrets.

### "Encryption key compromised / rotation"

1. Generate new key: `openssl rand -hex 32`.
2. Update `ENCRYPTION_KEY` env var in Vercel.
3. Deploy → `instrumentation.ts → validateEnv()` validates.
4. **Old encrypted data**: `ErpConnection.passwordEnc`, `User.totpSecretEnc`, `TenantIntegration.endpointEnc/secretEnc` were encrypted with old key.
   - Run a re-encryption migration script (currently manual, write one ad-hoc reading with old key + writing with new).
   - OR keep old key for read-only and only encrypt new data with new key.
5. Old key recorded in `EncryptionKey` table via `registerCurrentKey()` (visible at `/admin/key-history`).

### "Stripe webhook keeps failing"

1. Check Sentry: tag `component:stripe-webhook`.
2. Stripe dashboard → Webhooks → recent attempts → expand failed delivery.
3. Idempotency: handled via `ProcessedWebhook` table. To force replay:
   ```sql
   DELETE FROM "ProcessedWebhook" WHERE id = 'evt_xxx';
   ```
   Then trigger Stripe "Resend" from dashboard.

### "Mobile push not delivering"

1. Check `/admin/activity` — `mfa.*` and login events showing? Auth flow OK.
2. Check `NotificationLog` for channel=push status:
   ```sql
   SELECT status, COUNT(*) FROM "NotificationLog"
   WHERE channel = 'push' AND "createdAt" > NOW() - INTERVAL '1 day'
   GROUP BY status;
   ```
3. Expo Push API outage: https://status.expo.dev
4. Invalid tokens auto-cleaned by sender (`DeviceNotRegistered` → DB delete).

---

## 5. Routine ops procedures

### Replay a Stripe webhook

```sql
DELETE FROM "ProcessedWebhook" WHERE id = 'evt_xxx';
```

Then in Stripe dashboard → Webhooks → expand event → "Resend".

### Manually trigger a cron

```bash
curl -X GET -H "Authorization: Bearer $CRON_SECRET" \
  https://erpaio.vercel.app/api/cron/anomaly-detection
```

### Manually unlock a stuck cron

```sql
UPDATE "CronRun" SET status = 'FAILED', "finishedAt" = NOW(), "errorMessage" = 'manual unlock'
WHERE "jobName" = '<job>' AND status = 'RUNNING';
```

### Promote a user to sysadmin

```sql
UPDATE "User" SET "isSysAdmin" = true WHERE email = 'ops@example.com';
```

### Revoke all API tokens for a user (suspected leak)

```sql
UPDATE "ApiToken" SET revoked = true WHERE "userId" = '<uid>';
```

### Reset rate limit (debug)

If using Upstash: delete keys matching prefix via Upstash console.
If in-memory: deploy a new version (resets process state).

---

## 6. Maintenance mode

```bash
# Vercel UI → Environment Variables → MAINTENANCE_MODE = true
# Redeploy
```

`src/proxy.ts` redirects all traffic to `/maintenance` except:
- `/maintenance` itself
- `/status`
- `/api/health`
- `/api/cron/*`

To disable: unset env var + redeploy.

---

## 7. Observability

| Signal                         | Where                                       |
| ------------------------------ | ------------------------------------------- |
| Application errors             | Sentry (project ERPAIO)                     |
| Cron health                    | `/admin/cron-runs`                          |
| Cross-tenant activity audit    | `/admin/activity`                           |
| Tenant health scores           | `/admin/health-scores`                      |
| Encryption key rotation        | `/admin/key-history`                        |
| Public service status          | `/status` (polled by external uptime tools) |
| Health check                   | `/api/health` (DB) + `?deep=true` (cron)   |
| Token usage                    | `/dashboard/settings` per-tenant            |
| Notification delivery rate     | Query `NotificationLog` table                |
| Server logs                    | Vercel → Functions → logs                   |
| DB query analysis              | Supabase → Database → Query performance     |

---

## 8. Code change checklist

Before touching production code, verify:

- [ ] `npm test` passes (234/234)
- [ ] `npx tsc --noEmit` clean (web + mobile)
- [ ] `npx eslint . --max-warnings=0` clean
- [ ] Pre-commit hook ran (lint-staged)
- [ ] If schema changed: migration file in `prisma/migrations/<timestamp>_*/migration.sql`
- [ ] If security-sensitive: add `recordActivity()` audit trail
- [ ] If new API error: use `jsonError()` or `localizedError()` (no hardcoded TR/EN)
- [ ] If new endpoint: consider rate limit (`rateLimit()` with preset in `RATE_LIMITS`)

---

_Last updated: track PP, session A→PP. Update this when ops procedures change._
