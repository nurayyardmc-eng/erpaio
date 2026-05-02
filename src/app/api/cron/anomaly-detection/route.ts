import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { runAnomalyDetectionForTenant } from "@/lib/anomaly/engine";

export const runtime = "nodejs";
export const maxDuration = 300;

const TENANT_CONCURRENCY = 3;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  const auth = verifyCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "daily" ? "daily" : "hourly";
  const jobName = `anomaly-detection-${mode}`;

  const cronRun = await prisma.cronRun.create({
    data: { jobName, status: "RUNNING" },
  });

  try {
    const tenants = await prisma.tenant.findMany({
      where: { connections: { some: { status: "active" } } },
      select: { id: true, name: true },
    });

    if (tenants.length === 0) {
      await prisma.cronRun.update({
        where: { id: cronRun.id },
        data: { status: "SUCCESS", finishedAt: new Date(), tenantsTotal: 0 },
      });
      return NextResponse.json({
        ok: true,
        message: "İşlenecek aktif tenant yok",
        durationMs: Date.now() - startedAt,
      });
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

    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
        tenantsTotal: tenants.length,
        tenantsOk, tenantsFail, alertsCreated,
        metadata:
          failedTenants.length > 0
            ? (JSON.parse(JSON.stringify({ failedTenants })) as Prisma.InputJsonValue)
            : undefined,
      },
    });

    return NextResponse.json({
      ok: true, mode,
      tenantsTotal: tenants.length,
      tenantsOk, tenantsFail, alertsCreated,
      durationMs: Date.now() - startedAt,
      status: finalStatus,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[cron][${jobName}] Fatal error:`, err);

    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: errorMsg,
      },
    });

    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        const value = await worker(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return results;
}
