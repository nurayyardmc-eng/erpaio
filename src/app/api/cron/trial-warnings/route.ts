import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { assertCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { deriveCronFinalStatus } from "@/lib/cron/finalStatus";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/observability/requestId";
import { buildTrialWarningEmail, calcTrialDaysLeft } from "@/lib/trial/warningEmail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req);

  const denied = await assertCronAuth(req, requestId);
  if (denied) return denied;

  const log = childLogger({ component: "cron-trial-warnings", requestId });

  const lock = await acquireCronLock("trial-warnings");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run is in progress");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "duplicate", existingRunId: lock.existingRunId },
      { status: 409, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }
  const cronRunId = lock.cronRunId;

  const tenants = await prisma.tenant.findMany({
    where: {
      plan: "starter",
      trialEndsAt: { not: null },
      users: { some: {} },
    },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      users: {
        where: { role: "owner" },
        select: { email: true },
        take: 1,
      },
    },
  });

  const now = Date.now();

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    if (!tenant.trialEndsAt) continue;
    const owner = tenant.users[0];
    if (!owner?.email) {
      skipped++;
      continue;
    }

    const daysLeft = calcTrialDaysLeft(tenant.trialEndsAt, now);
    const email = buildTrialWarningEmail(daysLeft, tenant.name);
    if (!email) {
      skipped++;
      continue;
    }

    try {
      const res = await sendEmail({
        to: owner.email,
        subject: email.subject,
        html: email.html,
        tenantId: tenant.id,
      });
      if (res.ok) {
        sent++;
        log.info(
          { tenantId: tenant.id, daysLeft, to: owner.email, emailId: res.id },
          "Trial warning sent",
        );
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      log.error({ err, tenantId: tenant.id }, "Trial warning send failed");
      Sentry.captureException(err, {
        tags: { component: "cron-trial-warnings" },
        extra: { tenantId: tenant.id, daysLeft },
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info(
    { event: "cron_done", tenantsChecked: tenants.length, sent, skipped, errors, durationMs },
    "Trial warnings cron complete",
  );

  const finalStatus = deriveCronFinalStatus(errors, sent);
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: tenants.length,
    tenantsOk: sent + skipped,
    tenantsFail: errors,
  });

  return NextResponse.json(
    {
      ok: true,
      tenantsChecked: tenants.length,
      sent,
      skipped,
      errors,
      durationMs,
    },
    { headers: { [REQUEST_ID_HEADER]: requestId } },
  );
}
