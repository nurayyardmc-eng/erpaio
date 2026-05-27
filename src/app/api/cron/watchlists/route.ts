import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { assertCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { queryERP } from "@/lib/db/connector";
import { sendEmail } from "@/lib/notifications/email";
import { sendPushToTenant } from "@/lib/notifications/push";
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
    return NextResponse.json({ ok: true, skipped: true, reason: "duplicate", existingRunId: lock.existingRunId }, { status: 409 });
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

      await prisma.watchlist.update({
        where: { id: w.id },
        data: { lastRunAt: new Date(), lastValue: firstNumeric, triggeredAt: hit ? new Date() : w.triggeredAt },
      });

      if (hit) {
        triggered++;
        const msg = `${w.name}: ${firstNumeric} ${w.thresholdOp} ${w.thresholdVal} ✓`;

        // Track NNNN — trigger history. Watchlist.triggeredAt overwrite
        // ediliyor zaten; bu kayıt "ne sıklıkta hit ediyor" sorusu için.
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

        await prisma.alert.create({
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

        if (w.emailTo) {
          void sendEmail({
            to: w.emailTo,
            subject: `[ERPAIO WATCH] ${w.name}`,
            html: `<p>${msg}</p>`,
          });
        }

        void sendPushToTenant(w.tenantId, {
          category: "watchlists",
          title: `Watch: ${w.name}`,
          body: msg,
          data: { watchlistId: w.id },
        });
      }
    } catch (err) {
      failed++;
      Sentry.captureException(err, { tags: { component: "cron-watchlists", watchlistId: w.id } });
    }
  }

  const finalStatus = failed === 0 ? "SUCCESS" : triggered > 0 || failed < watchlists.length ? "PARTIAL_FAILURE" : "FAILED";
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: watchlists.length,
    tenantsOk: watchlists.length - failed,
    tenantsFail: failed,
    alertsCreated: triggered,
  });

  log.info({ triggered, total: watchlists.length, failed }, "Watchlist run completed");
  return NextResponse.json({ ok: true, triggered, total: watchlists.length });
}
