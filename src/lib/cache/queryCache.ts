import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const MIN_SUCCESS_FOR_HIT = 3;
const MAX_FAIL_RATE = 0.2;

const FEEDBACK_POSITIVE_BONUS = 2;
const FEEDBACK_NEGATIVE_PENALTY = 5;

export interface CacheLookupResult {
  hit: boolean;
  cacheId?: string;
  sqlQuery?: string;
  successCount?: number;
  failCount?: number;
}

export function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuestion(question: string, tenantId: string): string {
  const normalized = normalizeQuestion(question);
  return createHash("sha256").update(`${tenantId}::${normalized}`).digest("hex");
}

export async function lookupCache(
  tenantId: string,
  question: string,
): Promise<CacheLookupResult> {
  const questionHash = hashQuestion(question, tenantId);

  const row = await prisma.queryCache.findUnique({
    where: { tenantId_questionHash: { tenantId, questionHash } },
  });

  if (!row) return { hit: false };

  const total = row.successCount + row.failCount;
  const failRate = total === 0 ? 0 : row.failCount / total;

  const meetsThreshold =
    row.successCount >= MIN_SUCCESS_FOR_HIT && failRate <= MAX_FAIL_RATE;

  if (!meetsThreshold) {
    return {
      hit: false,
      cacheId: row.id,
      successCount: row.successCount,
      failCount: row.failCount,
    };
  }

  await prisma.queryCache.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    hit: true,
    cacheId: row.id,
    sqlQuery: row.sqlQuery,
    successCount: row.successCount,
    failCount: row.failCount,
  };
}

export async function writeCache(
  tenantId: string,
  question: string,
  sqlQuery: string,
): Promise<string> {
  const questionHash = hashQuestion(question, tenantId);

  const row = await prisma.queryCache.upsert({
    where: { tenantId_questionHash: { tenantId, questionHash } },
    create: {
      tenantId,
      questionHash,
      question: normalizeQuestion(question),
      sqlQuery,
      successCount: 1,
    },
    update: {
      sqlQuery,
      successCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return row.id;
}

export async function recordOutcome(
  cacheId: string,
  success: boolean,
): Promise<void> {
  await prisma.queryCache.update({
    where: { id: cacheId },
    data: {
      [success ? "successCount" : "failCount"]: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function applyFeedback(
  cacheId: string,
  feedback: 1 | -1,
): Promise<void> {
  if (feedback === 1) {
    await prisma.queryCache.update({
      where: { id: cacheId },
      data: { successCount: { increment: FEEDBACK_POSITIVE_BONUS } },
    });
    return;
  }

  const current = await prisma.queryCache.findUnique({
    where: { id: cacheId },
    select: { successCount: true },
  });

  if (!current) return;

  if (current.successCount === 0) {
    await prisma.queryCache.delete({ where: { id: cacheId } });
    return;
  }

  await prisma.queryCache.update({
    where: { id: cacheId },
    data: { failCount: { increment: FEEDBACK_NEGATIVE_PENALTY } },
  });
}

export async function invalidateForTenant(tenantId: string): Promise<number> {
  const result = await prisma.queryCache.deleteMany({ where: { tenantId } });
  return result.count;
}
