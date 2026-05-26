/**
 * Retention windows for the daily cleanup cron.
 *
 * Each value is the number of days a record type is kept before the cleanup
 * cron permanently deletes it. These are policy decisions — KVKK / GDPR /
 * operational constraints — and a regression here can cause:
 *  - Premature deletion of data we're legally required to retain
 *  - Unbounded table growth (cron health dashboard, anomaly baseline)
 *  - User-visible loss of recent history
 *
 * Track IIIII — moved into a dedicated constants module so the policy table
 * is reviewable in one place and protected by invariant tests.
 *
 * SAKLI TUTULANLAR (silinmiyor — NOT in this table):
 *  - ConsentLog (KVKK md. 7 + 11 audit, kalıcı)
 *  - ActivityLog (KVKK md. 13, ≥ 2 yıl, ayrı policy)
 *  - Alert (status="open" — kullanıcı işleme alana kadar)
 *  - Tenant/User (business data, manuel)
 */
import { ONE_DAY_MS } from "@/lib/time/units";

// Re-exported so existing callers and tests (cron/retention.test.ts +
// retentionCutoff() consumers) keep their import path. Canonical definition
// lives in lib/time/units.ts (Track PPPPPPP).
export { ONE_DAY_MS };

export const RETENTION = {
  /** Stripe idempotency — retry penceresi 3 gün, 30 gün safe margin. */
  processedWebhookDays: 30,
  /** Cron health dashboard için 90 gün geçmiş yeterli. */
  cronRunDays: 90,
  /** Token zaten 1 saat geçerli; expired olanların 7 gün sonra silinmesi audit için yeter. */
  passwordResetTokenExpiredDays: 7,
  /** Email doğrulama token'ı 24 saat geçerli; expired 30 gün sonra silinir. */
  emailVerificationTokenExpiredDays: 30,
  /** Resolved/acked alert'ler 180 gün sonra silinir; open Alert'ler ASLA. */
  resolvedAlertDays: 180,
  /** Notification log 180 gün — delivery health dashboard'a yetecek geçmiş. */
  notificationLogDays: 180,
  /** Slow query trace 30 gün — perf inceleme için yeterli, eski log noise yapar. */
  slowQueryLogDays: 30,
  /** Anomaly baseline rolling history 90 gün — engine `take: historyWindow+1`. */
  anomalyBaselineDays: 90,
  /** Watchlist trigger 90 gün — detay sayfası son 50 tetiklenmeyi gösterir. */
  watchlistTriggerDays: 90,
} as const satisfies Record<string, number>;

export type RetentionKey = keyof typeof RETENTION;

/**
 * Compute the Date threshold for "older than N days" deletion queries:
 *   prisma.X.deleteMany({ where: { createdAt: { lt: retentionCutoff(...) } } })
 */
export function retentionCutoff(days: number, now: number = Date.now()): Date {
  return new Date(now - days * ONE_DAY_MS);
}
