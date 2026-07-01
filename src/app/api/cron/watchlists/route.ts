import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { assertCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, cronSkipResponse, finalizeCronRun } from "@/lib/cron/lock";
import { deriveCronFinalStatus } from "@/lib/cron/finalStatus";
import { queryERP } from "@/lib/db/connector";
import { sendEmail } from "@/lib/notifications/email";
import { sendPushToTenant } from "@/lib/notifications/push";
import { dispatchAlert } from "@/lib/notifications/integrations";
import { childLogger } from "@/lib/observability/logger";
import { compareThreshold, extractFirstNumeric } from "@/lib/threshold/compare";
import { findLastSqlForQuestion } from "@/lib/chat/findLastSqlForQuestion";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = childLogger({ component: "cron-watchlists" });

export async function GET(req: NextRequest) {
  const denied = await assertCronAuth(req);
  if (denied) return denied;

  const lock = await acquireCronLock("watchlists");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run is in progress");
    return cronSkipResponse(lock.existingRunId);
  }
  const cronRunId = lock.cronRunId;

  const watchlists = await prisma.watchlist.findMany({
    where: { enabled: true },
    take: 500,
  });

  let triggered = 0;
  let failed = 0;

  for (const w of watchlists) {
    try {
      const sql = await findLastSqlForQuestion(w.tenantId, w.userId, w.question);
      if (!sql) continue;

      const rows = await queryERP(w.connectionId, sql);
      const firstNumeric = extractFirstNumeric(rows[0]);
      if (firstNumeric === null) continue;

      const hit = compareThreshold(w.thresholdOp, firstNumeric, w.thresholdVal);
      // Edge-trigger: only NOTIFY on a NEW crossing. A stateless level check
      // re-fired the alert + email + push every hour while the condition stayed
      // true (~24×/day), flooding inboxes and training users to ignore alerts.
      // wasHit reconstructs the previous run's state from lastValue.
      const wasHit =
        w.lastValue !== null && compareThreshold(w.thresholdOp, w.lastValue, w.thresholdVal);
      const newCrossing = hit && !wasHit;

      await prisma.watchlist.update({
        where: { id: w.id },
        data: { lastRunAt: new Date(), lastValue: firstNumeric, triggeredAt: newCrossing ? new Date() : w.triggeredAt },
      });

      // Trigger history stays per-hit (Track NNNN — "how often does it hit");
      // only the alert + notifications are edge-gated.
      if (hit) {
        // Threshold op/val snapshot edilir — user sonra threshold değiştirir
        // ama eski tetiklenmeleri o anki eşikle yorumlayabilelim.
        await prisma.watchlistTrigger.create({
          data: {
            watchlistId: w.id,
            tenantId: w.tenantId,
            value: firstNumeric,
            thresholdOp: w.thresholdOp,
            thresholdVal: w.thresholdVal,
          },
        });
      }

      if (newCrossing) {
        triggered++;
        const msg = `${w.name}: ${firstNumeric} ${w.thresholdOp} ${w.thresholdVal} ✓`;

        const alert = await prisma.alert.create({
          data: {
            tenantId: w.tenantId,
            type: "watchlist",
            severity: "high",
            title: `Watchlist tetiklendi: ${w.name}`,
            description: msg,
            module: "watchlist",
            evidence: { value: firstNumeric, threshold: w.thresholdVal, op: w.thresholdOp } as object,
          },
        });

        // Await delivery — void'd fire-and-forget promises can be dropped when
        // the serverless function freezes before the fetch resolves.
        // allSettled so one channel's failure never fails the watchlist loop.
        await Promise.allSettled([
          w.emailTo
            ? sendEmail({ to: w.emailTo, subject: `[ERPAIO WATCH] ${w.name}`, html: `<p>${msg}</p>`, tenantId: w.tenantId, alertId: alert.id })
            : Promise.resolve(),
          sendPushToTenant(w.tenantId, {
            category: "watchlists",
            title: `Watch: ${w.name}`,
            body: msg,
            data: { watchlistId: w.id },
          }),
          // Slack / Teams / generic-webhook integrations (self-gated by enabled).
          dispatchAlert(w.tenantId, alert),
        ]);
      }
    } catch (err) {
      failed++;
      Sentry.captureException(err, { tags: { component: "cron-watchlists", watchlistId: w.id } });
    }
  }

  const finalStatus = deriveCronFinalStatus(failed, watchlists.length - failed);
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: watchlists.length,
    tenantsOk: watchlists.length - failed,
    tenantsFail: failed,
    alertsCreated: triggered,
  });

  log.info({ triggered, total: watchlists.length, failed }, "Watchlist run completed");
  return NextResponse.json({ ok: true, triggered, total: watchlists.length });
}
