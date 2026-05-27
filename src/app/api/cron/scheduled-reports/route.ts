import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { assertCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { queryERP } from "@/lib/db/connector";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { shouldFireSchedule, renderReportHtml } from "@/lib/reports/render";
import { findLastSqlForQuestion } from "@/lib/chat/findLastSqlForQuestion";
import { errorMessage } from "@/lib/errors/errorMessage";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = childLogger({ component: "cron-reports" });

export async function GET(req: NextRequest) {
  const denied = await assertCronAuth(req);
  if (denied) return denied;

  const lock = await acquireCronLock("scheduled-reports");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run is in progress");
    return NextResponse.json({ ok: true, skipped: true, reason: "duplicate", existingRunId: lock.existingRunId }, { status: 409 });
  }
  const cronRunId = lock.cronRunId;

  const reports = await prisma.scheduledReport.findMany({
    where: { enabled: true },
    take: 200,
  });

  let executed = 0;
  let failed = 0;

  for (const r of reports) {
    if (!shouldFireSchedule(r.schedule)) continue;

    try {
      const sql = await findLastSqlForQuestion(r.tenantId, r.userId, r.question);
      if (!sql) {
        log.info({ reportId: r.id }, "No cached SQL — manual run needed");
        continue;
      }

      const rows = await queryERP(r.connectionId, sql);
      const html = renderReportHtml(r.name, r.question, sql, rows);

      await sendEmail({
        to: r.emailTo,
        subject: `[ERPAIO Rapor] ${r.name}`,
        html,
      });

      await prisma.scheduledReport.update({
        where: { id: r.id },
        data: { lastRunAt: new Date(), lastError: null },
      });
      executed++;
      log.info({ reportId: r.id, rows: rows.length }, "Scheduled report sent");
    } catch (err) {
      failed++;
      const msg = errorMessage(err);
      await prisma.scheduledReport.update({
        where: { id: r.id },
        data: { lastError: msg.slice(0, 500) },
      }).catch((updateErr) => {
        log.error({ err: updateErr, reportId: r.id }, "Failed to record lastError on scheduled report");
      });
      Sentry.captureException(err, { tags: { component: "cron-reports", reportId: r.id } });
    }
  }

  const finalStatus = failed === 0 ? "SUCCESS" : executed > 0 ? "PARTIAL_FAILURE" : "FAILED";
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: reports.length,
    tenantsOk: executed,
    tenantsFail: failed,
  });

  return NextResponse.json({ ok: true, executed, failed, total: reports.length });
}

