// Sprint P10 — retention hook cron.
//
// Finds tenants who signed up 24–72h ago, never created an ERP connection,
// and haven't already been nudged, then emails the owner a one-time help
// offer. Dedup uses an ActivityLog "retention.help_sent" marker (no schema
// migration). Mirrors the trial-warnings cron structure.

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { assertCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, cronSkipResponse, finalizeCronRun } from "@/lib/cron/lock";
import { deriveCronFinalStatus } from "@/lib/cron/finalStatus";
import { sendEmail } from "@/lib/notifications/email";
import { recordActivity } from "@/lib/audit/activity";
import { childLogger } from "@/lib/observability/logger";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/observability/requestId";
import {
  retentionWindow,
  buildRetentionEmail,
  type RetentionLocale,
} from "@/lib/retention/abandonedWizard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req);

  const denied = await assertCronAuth(req, requestId);
  if (denied) return denied;

  const log = childLogger({ component: "cron-retention", requestId });

  const lock = await acquireCronLock("retention");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run is in progress");
    return cronSkipResponse(lock.existingRunId, { headers: { [REQUEST_ID_HEADER]: requestId } });
  }
  const cronRunId = lock.cronRunId;

  const window = retentionWindow();

  // Abandoned wizard: created in the window, zero connections, never nudged,
  // and has an owner to email.
  const tenants = await prisma.tenant.findMany({
    where: {
      createdAt: { gte: window.notBefore, lte: window.notAfter },
      connections: { none: {} },
      activityLogs: { none: { action: "retention.help_sent" } },
      users: { some: { role: "owner" } },
    },
    select: {
      id: true,
      defaultLocale: true,
      users: {
        where: { role: "owner" },
        select: { id: true, email: true },
        take: 1,
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    const owner = tenant.users[0];
    if (!owner?.email) {
      skipped++;
      continue;
    }
    const locale: RetentionLocale = tenant.defaultLocale === "en" ? "en" : "tr";
    const mail = buildRetentionEmail(locale);
    try {
      const res = await sendEmail({
        to: owner.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tenantId: tenant.id,
      });
      if (res.ok) {
        sent++;
        // Dedup marker — never nudge this tenant again.
        await recordActivity({
          tenantId: tenant.id,
          userId: owner.id,
          email: owner.email,
          action: "retention.help_sent",
        });
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      log.error({ err, tenantId: tenant.id }, "Retention email send failed");
      Sentry.captureException(err, {
        tags: { component: "cron-retention" },
        extra: { tenantId: tenant.id },
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info(
    { event: "cron_done", tenantsChecked: tenants.length, sent, skipped, errors, durationMs },
    "Retention cron complete",
  );

  const finalStatus = deriveCronFinalStatus(errors, sent);
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: tenants.length,
    tenantsOk: sent + skipped,
    tenantsFail: errors,
  });

  return NextResponse.json(
    { ok: true, tenantsChecked: tenants.length, sent, skipped, errors, durationMs },
    { headers: { [REQUEST_ID_HEADER]: requestId } },
  );
}
