// Cron job concurrency lock — şu pattern'i tek yere topla:
//   1. Aynı jobName için yakın zamanda RUNNING varsa skip (duplicate)
//   2. Yoksa CronRun create + caller'a ID dön
//   3. Caller iş bitince finalizeCronRun ile status/metadata yaz
//
// Neden gerek var: GitHub Actions retry'leri ve Vercel timeout-then-reinvocation
// senaryolarında aynı cron iki kez başlayabilir. Sonuç: duplicate alertler,
// duplicate email'ler, ERP rate-limit problemi.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Stale threshold — bu süreyi geçen RUNNING kayıtlar yok sayılır. */
export const DEFAULT_STALE_MS = 10 * 60_000;

export interface AcquiredLock {
  ok: true;
  cronRunId: string;
}

export interface SkippedLock {
  ok: false;
  reason: "duplicate";
  existingRunId: string;
  existingStartedAt: Date;
}

export type LockResult = AcquiredLock | SkippedLock;

/**
 * Cron lock al — duplicate run'ı engelle, yeni CronRun başlat.
 *
 *   const lock = await acquireCronLock("anomaly-detection-hourly");
 *   if (!lock.ok) return Response skip;
 *   try { ... } finally { await finalizeCronRun(lock.cronRunId, ...); }
 */
export async function acquireCronLock(
  jobName: string,
  staleMs: number = DEFAULT_STALE_MS,
): Promise<LockResult> {
  const existing = await prisma.cronRun.findFirst({
    where: {
      jobName,
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - staleMs) },
    },
    select: { id: true, startedAt: true },
  });
  if (existing) {
    return {
      ok: false,
      reason: "duplicate",
      existingRunId: existing.id,
      existingStartedAt: existing.startedAt,
    };
  }

  const run = await prisma.cronRun.create({
    data: { jobName, status: "RUNNING" },
  });
  return { ok: true, cronRunId: run.id };
}

export type FinalStatus = "SUCCESS" | "PARTIAL_FAILURE" | "FAILED";

/** Cron'ı bitirirken kayıt güncelle. */
export async function finalizeCronRun(
  cronRunId: string,
  status: FinalStatus,
  fields: {
    tenantsTotal?: number;
    tenantsOk?: number;
    tenantsFail?: number;
    alertsCreated?: number;
    errorMessage?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  } = {},
): Promise<void> {
  await prisma.cronRun.update({
    where: { id: cronRunId },
    data: {
      status,
      finishedAt: new Date(),
      tenantsTotal: fields.tenantsTotal ?? 0,
      tenantsOk: fields.tenantsOk ?? 0,
      tenantsFail: fields.tenantsFail ?? 0,
      alertsCreated: fields.alertsCreated ?? 0,
      errorMessage: fields.errorMessage ?? null,
      ...(fields.metadata !== undefined && fields.metadata !== null
        ? { metadata: fields.metadata }
        : {}),
    },
  });
}
