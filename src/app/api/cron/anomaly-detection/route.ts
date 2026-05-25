import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { runAnomalyDetectionForTenant } from "@/lib/anomaly/engine";
import { childLogger } from "@/lib/observability/logger";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/observability/requestId";
import { runWithConcurrency } from "@/lib/http/concurrency";

export const runtime = "nodejs";
export const maxDuration = 300;

const TENANT_CONCURRENCY = 3;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req);

  const auth = await verifyCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: 401, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "daily" ? "daily" : "hourly";
  const jobName = `anomaly-detection-${mode}`;
  const log = childLogger({ component: "cron", jobName, requestId });

  Sentry.setTag("cron.job", jobName);
  Sentry.setTag("cron.requestId", requestId);

  log.info({ event: "cron_start" }, "Cron run started");

  const lock = await acquireCronLock(jobName);
  if (!lock.ok) {
    log.warn(
      { event: "cron_skip_duplicate", existingId: lock.existingRunId, existingStartedAt: lock.existingStartedAt },
      "Skipping — another run is in progress",
    );
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "Another run is in progress",
        existingRunId: lock.existingRunId,
      },
      { status: 409, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }
  const cronRunId = lock.cronRunId;

  try {
    const tenants = await prisma.tenant.findMany({
      where: { connections: { some: { status: "active" } } },
      select: { id: true, name: true },
    });

    if (tenants.length === 0) {
      await finalizeCronRun(cronRunId, "SUCCESS", { tenantsTotal: 0 });
      log.info({ event: "cron_no_tenants" }, "No active tenants to process");
      return NextResponse.json(
        {
          ok: true,
          message: "İşlenecek aktif tenant yok",
          durationMs: Date.now() - startedAt,
        },
        { headers: { [REQUEST_ID_HEADER]: requestId } },
      );
    }

    const results = await runWithConcurrency(
      tenants,
      TENANT_CONCURRENCY,
      (tenant) => runAnomalyDetectionForTenant(tenant.id, mode),
    );

    let tenantsOk = 0;
    let tenantsFail = 0;
    let alertsCreated = 0;
    type FailedTenant = {
      tenantId: string;
      errors: Array<{ metric: string; error: string }> | string;
    };
    const failedTenants: FailedTenant[] = [];

    for (const r of results) {
      if (r.status === "fulfilled") {
        const v = r.value;
        if (v.errors.length === 0) {
          tenantsOk++;
        } else if (v.metricsRun > 0) {
          tenantsOk++;
          failedTenants.push({ tenantId: v.tenantId, errors: v.errors });
        } else {
          tenantsFail++;
          failedTenants.push({ tenantId: v.tenantId, errors: v.errors });
        }
        alertsCreated += v.alertsCreated;
      } else {
        tenantsFail++;
        failedTenants.push({
          tenantId: "unknown",
          errors: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }

    const finalStatus =
      tenantsFail === 0 ? "SUCCESS"
      : tenantsOk > 0 ? "PARTIAL_FAILURE"
      : "FAILED";

    await finalizeCronRun(cronRunId, finalStatus, {
      tenantsTotal: tenants.length,
      tenantsOk,
      tenantsFail,
      alertsCreated,
      metadata:
        failedTenants.length > 0
          ? (JSON.parse(JSON.stringify({ failedTenants })) as Prisma.InputJsonValue)
          : null,
    });

    log.info(
      {
        event: "cron_done",
        tenantsTotal: tenants.length,
        tenantsOk,
        tenantsFail,
        alertsCreated,
        finalStatus,
        durationMs: Date.now() - startedAt,
      },
      "Cron run completed",
    );

    if (finalStatus !== "SUCCESS") {
      Sentry.captureMessage(`Cron ${jobName} ${finalStatus}`, {
        level: finalStatus === "FAILED" ? "error" : "warning",
        tags: { component: "cron", jobName, finalStatus },
        extra: { tenantsOk, tenantsFail, alertsCreated, failedTenants },
      });
    }

    return NextResponse.json(
      {
        ok: true, mode,
        tenantsTotal: tenants.length,
        tenantsOk, tenantsFail, alertsCreated,
        durationMs: Date.now() - startedAt,
        status: finalStatus,
      },
      { headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ err, event: "cron_fatal" }, "Cron fatal error");
    Sentry.captureException(err, {
      tags: { component: "cron", jobName },
      extra: { requestId },
    });

    await finalizeCronRun(cronRunId, "FAILED", { errorMessage: errorMsg });

    return NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 500, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }
}

