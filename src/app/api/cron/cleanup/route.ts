import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { sendCronHealthDigest } from "@/lib/cron/healthDigest";
import { childLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = childLogger({ component: "cron-cleanup" });

const ONE_DAY_MS = 24 * 60 * 60_000;

/**
 * Retention policies — KVKK + GDPR + operational needs:
 *
 * - ProcessedWebhook: 30 gün. Stripe retry penceresi 3 gün, 30 gün safe margin.
 * - CronRun: 90 gün. Cron health dashboard'a yetecek geçmiş, sonsuz değil.
 * - PasswordResetToken: 7 gün (expired olanlar). Token zaten 1 saat geçerli.
 * - EmailVerificationToken: 30 gün (expired). 24 saat geçerli.
 * - Alert (resolved/acked): 180 gün. status="open" Alert'ler asla silinmez.
 * - SlowQueryLog: 30 gün. Eşik üstü ERP query trace; perf inceleme için
 *   son 30 gün yeterli, eski log noise yapar + tablo büyür.
 * - AnomalyBaseline: 90 gün. Engine `take: historyWindow+1` (default 30)
 *   ile son N kayıtları okur; 90 gün rolling history yeterli + yıllık
 *   metric scale'de tablo şişmesini engeller.
 * - WatchlistTrigger: 90 gün. Detay sayfası son 50 tetiklenmeyi gösterir;
 *   günde ortalama 1 hit'te 90 gün ≈ 90 tetiklenme — limit'in üstünde.
 *   Sık tetiklenen watchlist'lerde de tablo unbounded grow olmaz.
 *
 * SAKLI TUTULANLAR (silinmiyor):
 * - ConsentLog: KVKK md. 7 + 11 audit trail, kalıcı.
 * - ActivityLog: KVKK md. 13 işleme faaliyeti, en az 2 yıl. (Otomatik
 *   temizleme yok — büyürse manuel ya da ayrı policy.)
 * - MfaRecoveryCode: zaten consumeRecoveryCode kullandıktan sonra usedAt set
 *   ediliyor; user silinince cascade.
 * - Alert (open): kullanıcı işleme alana kadar tutulur.
 * - Tenant/User: business data, manuel.
 */
const RETENTION = {
  processedWebhookDays: 30,
  cronRunDays: 90,
  passwordResetTokenExpiredDays: 7,
  emailVerificationTokenExpiredDays: 30,
  resolvedAlertDays: 180,
  notificationLogDays: 180,
  slowQueryLogDays: 30,
  anomalyBaselineDays: 90,
  watchlistTriggerDays: 90,
} as const;

export async function GET(req: NextRequest) {
  const auth = await verifyCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const lock = await acquireCronLock("cleanup");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run in progress");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "duplicate", existingRunId: lock.existingRunId },
      { status: 409 },
    );
  }
  const cronRunId = lock.cronRunId;
  const startedAt = Date.now();

  const now = Date.now();
  const results: Record<string, number> = {};
  let totalDeleted = 0;
  let errors = 0;

  try {
    // ProcessedWebhook — Stripe idempotency window passed
    {
      const before = new Date(now - RETENTION.processedWebhookDays * ONE_DAY_MS);
      const r = await prisma.processedWebhook.deleteMany({
        where: { processedAt: { lt: before } },
      });
      results.processedWebhook = r.count;
      totalDeleted += r.count;
    }

    // CronRun — keep last 90 days for health dashboard
    {
      const before = new Date(now - RETENTION.cronRunDays * ONE_DAY_MS);
      // Don't delete RUNNING ones (stale) — they'd be cleaned by cron-lock guard
      const r = await prisma.cronRun.deleteMany({
        where: { startedAt: { lt: before }, status: { not: "RUNNING" } },
      });
      results.cronRun = r.count;
      totalDeleted += r.count;
    }

    // PasswordResetToken — expired
    {
      const before = new Date(now - RETENTION.passwordResetTokenExpiredDays * ONE_DAY_MS);
      const r = await prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: before } },
      });
      results.passwordResetToken = r.count;
      totalDeleted += r.count;
    }

    // EmailVerificationToken — expired
    {
      const before = new Date(now - RETENTION.emailVerificationTokenExpiredDays * ONE_DAY_MS);
      const r = await prisma.emailVerificationToken.deleteMany({
        where: { expiresAt: { lt: before } },
      });
      results.emailVerificationToken = r.count;
      totalDeleted += r.count;
    }

    // Alert — sadece resolved/acked olanlar, open alert'ler kalıcı.
    {
      const before = new Date(now - RETENTION.resolvedAlertDays * ONE_DAY_MS);
      const r = await prisma.alert.deleteMany({
        where: {
          createdAt: { lt: before },
          status: { in: ["resolved", "acked"] },
        },
      });
      results.alertResolved = r.count;
      totalDeleted += r.count;
    }

    // NotificationLog — delivery audit, 180 gün yeterli (alert resolved
    // retention'la senkron).
    {
      const before = new Date(now - RETENTION.notificationLogDays * ONE_DAY_MS);
      const r = await prisma.notificationLog.deleteMany({
        where: { createdAt: { lt: before } },
      });
      results.notificationLog = r.count;
      totalDeleted += r.count;
    }

    // SlowQueryLog — eşik üstü ERP query trace, 30 gün retention.
    // Tenant silinince cascade ile zaten siliniyor; bu eski log retention'ı.
    {
      const before = new Date(now - RETENTION.slowQueryLogDays * ONE_DAY_MS);
      const r = await prisma.slowQueryLog.deleteMany({
        where: { createdAt: { lt: before } },
      });
      results.slowQueryLog = r.count;
      totalDeleted += r.count;
    }

    // AnomalyBaseline — hourly cron her metric için 1 row üretir, tablo
    // unbounded grow eğilimli. Engine son 30 entry'i okuyor; 90 gün safe
    // margin (daily metrics 30 history * 1 day = 30 gün, 3x emniyet payı).
    {
      const before = new Date(now - RETENTION.anomalyBaselineDays * ONE_DAY_MS);
      const r = await prisma.anomalyBaseline.deleteMany({
        where: { capturedAt: { lt: before } },
      });
      results.anomalyBaseline = r.count;
      totalDeleted += r.count;
    }

    // WatchlistTrigger — Track NNNN. Her watchlist hit'i 1 row; sık
    // tetiklenenler tablo şişirir. Detay UI son 50'yi gösteriyor,
    // 90 gün rolling history bu cap'in üstünde + tablo bounded.
    {
      const before = new Date(now - RETENTION.watchlistTriggerDays * ONE_DAY_MS);
      const r = await prisma.watchlistTrigger.deleteMany({
        where: { triggeredAt: { lt: before } },
      });
      results.watchlistTrigger = r.count;
      totalDeleted += r.count;
    }
  } catch (err) {
    errors++;
    log.error({ err, partial: results }, "Cleanup failed mid-run");
    Sentry.captureException(err, { tags: { component: "cron-cleanup" }, extra: { partial: results } });
  }

  log.info(
    { event: "cleanup_done", totalDeleted, results, errors, durationMs: Date.now() - startedAt },
    "Cleanup cron completed",
  );

  await finalizeCronRun(cronRunId, errors === 0 ? "SUCCESS" : "PARTIAL_FAILURE", {
    tenantsTotal: 0, // not tenant-scoped
    alertsCreated: totalDeleted,
    errorMessage: errors > 0 ? "Partial cleanup — see Sentry" : null,
  });

  // Tail step: cron health digest — son 24h'taki başarısızlıkları sysadmin'e
  // tek email ile özetler. Best-effort, hata fırlatırsa cleanup'ı bozma.
  // SYSADMIN_NOTIFY_EMAIL env boşsa no-op.
  let digestResult: { ok: boolean; failuresFound: number } | null = null;
  try {
    digestResult = await sendCronHealthDigest();
  } catch (err) {
    log.error({ err }, "Cron health digest failed");
    Sentry.captureException(err, { tags: { component: "cron-cleanup", subsystem: "health-digest" } });
  }

  return NextResponse.json({
    ok: true,
    totalDeleted,
    results,
    digest: digestResult,
    durationMs: Date.now() - startedAt,
  });
}
