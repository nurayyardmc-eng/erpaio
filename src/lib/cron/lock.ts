// Cron job concurrency lock — şu pattern'i tek yere topla:
//   1. Aynı jobName için yakın zamanda RUNNING varsa skip (duplicate)
//   2. Yoksa CronRun create + caller'a ID dön
//   3. Caller iş bitince finalizeCronRun ile status/metadata yaz
//
// Neden gerek var: GitHub Actions retry'leri ve Vercel timeout-then-reinvocation
// senaryolarında aynı cron iki kez başlayabilir. Sonuç: duplicate alertler,
// duplicate email'ler, ERP rate-limit problemi.
//
// ⚠ TIMEZONE: Tüm cron schedule'lar UTC. Türkiye UTC+3 ise human-readable
// saat farkı vardır. Örnek: workflow `cron: '0 9 * * *'` = TR saatiyle 12:00.
// Workflow yaml'larında human-readable yorum şart (örn: trial-warnings-daily.yml).

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
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

/**
 * Standard 409 skip response for duplicate cron runs.
 *
 * Track RRRRRRRRRRR — 4 cron route AYNI NextResponse.json yapisi
 * kullaniyordu: { ok: true, skipped: true, reason: "duplicate",
 * existingRunId }, status 409.
 *
 * Caller routes log mesajini kendi kontrol eder (component tag + event
 * formati farkli olabilir); bu helper sadece response shape'i tek
 * noktada tutar.
 *
 * Optional headers paramı request-id propagation icin (anomaly-detection
 * gibi observability-heavy route'lar request-id header'ini geri yansitir).
 */
export function cronSkipResponse(
  existingRunId: string,
  opts?: { headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(
    { ok: true, skipped: true, reason: "duplicate", existingRunId },
    { status: 409, headers: opts?.headers },
  );
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
