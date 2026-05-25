import { prisma } from "@/lib/db/prisma";

/**
 * Pure-math input for calculateHealthScore. Test edilebilir;
 * computeHealthScore DB I/O'su sonra bu helper'a sığır.
 */
export interface HealthScoreInput {
  userMessages: number;
  assistantMessages: number;
  errors: number;
  feedbackGiven: number;
  cacheSuccess: number;
  cacheFail: number;
  daysActive: number;
}

/**
 * Pure math: HealthScore computation (Track FFFF — refactored out of
 * DB-bound computeHealthScore). Test-edilebilir; weights/grade-buckets
 * burada.
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScore {
  const cacheTotal = input.cacheSuccess + input.cacheFail;

  const activity = Math.min(1, input.userMessages / 100);
  const qualityRate = input.assistantMessages > 0
    ? 1 - input.errors / input.assistantMessages
    : 0;
  const feedbackRate = input.assistantMessages > 0
    ? input.feedbackGiven / input.assistantMessages
    : 0;
  const cacheHitRate = cacheTotal > 0 ? input.cacheSuccess / cacheTotal : 0;
  const errorRate = input.assistantMessages > 0
    ? input.errors / input.assistantMessages
    : 0;
  const dayRate = Math.min(1, input.daysActive / 20);

  const score = Math.round(
    activity * 25 + qualityRate * 25 + feedbackRate * 15 + cacheHitRate * 15 + dayRate * 20,
  );

  const grade = healthScoreGrade(score);

  return {
    score,
    grade,
    signals: {
      activity,
      qualityRate,
      feedbackRate,
      cacheHitRate,
      errorRate,
      daysActive: input.daysActive,
    },
  };
}

export interface HealthScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  signals: {
    activity: number;
    qualityRate: number;
    feedbackRate: number;
    cacheHitRate: number;
    errorRate: number;
    daysActive: number;
  };
}

export async function computeHealthScore(tenantId: string): Promise<HealthScore> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);

  const [messages, distinctDays] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { session: { tenantId }, createdAt: { gte: since } },
      select: { role: true, success: true, feedback: true, createdAt: true },
    }),
    prisma.$queryRaw<Array<{ d: Date }>>`
      SELECT DISTINCT DATE("createdAt") AS d
      FROM "ChatMessage" cm
      JOIN "ChatSession" cs ON cs.id = cm."sessionId"
      WHERE cs."tenantId" = ${tenantId} AND cm."createdAt" >= ${since}
    `,
  ]);

  const userMessages = messages.filter((m) => m.role === "user").length;
  const assistantMessages = messages.filter((m) => m.role === "assistant").length;
  const errors = messages.filter((m) => m.role === "assistant" && !m.success).length;
  const feedbackGiven = messages.filter((m) => m.feedback !== null).length;

  const qc = await prisma.queryCache.aggregate({
    where: { tenantId, lastUsedAt: { gte: since } },
    _sum: { successCount: true, failCount: true },
  });

  return calculateHealthScore({
    userMessages,
    assistantMessages,
    errors,
    feedbackGiven,
    cacheSuccess: qc._sum.successCount ?? 0,
    cacheFail: qc._sum.failCount ?? 0,
    daysActive: distinctDays.length,
  });
}

/**
 * Map a 0..100 health score to its grade letter (A/B/C/D/F).
 *
 * Track PPPPPP — extracted so admin/health-scores page and other UI can
 * compute the grade consistently with `calculateHealthScore`. Boundaries
 * (≥85=A, ≥70=B, ≥55=C, ≥40=D, else F) regression marker.
 */
export type HealthGrade = "A" | "B" | "C" | "D" | "F";

export function healthScoreGrade(score: number): HealthGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
