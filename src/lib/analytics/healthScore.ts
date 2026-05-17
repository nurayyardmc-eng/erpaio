import { prisma } from "@/lib/db/prisma";

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
  const cacheTotal = (qc._sum.successCount ?? 0) + (qc._sum.failCount ?? 0);

  const activity = Math.min(1, userMessages / 100);
  const qualityRate = assistantMessages > 0 ? 1 - errors / assistantMessages : 0;
  const feedbackRate = assistantMessages > 0 ? feedbackGiven / assistantMessages : 0;
  const cacheHitRate = cacheTotal > 0 ? (qc._sum.successCount ?? 0) / cacheTotal : 0;
  const errorRate = assistantMessages > 0 ? errors / assistantMessages : 0;
  const daysActive = distinctDays.length;
  const dayRate = Math.min(1, daysActive / 20);

  const score = Math.round(
    (activity * 25 + qualityRate * 25 + feedbackRate * 15 + cacheHitRate * 15 + dayRate * 20) * 1,
  );

  const grade =
    score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";

  return {
    score,
    grade,
    signals: {
      activity,
      qualityRate,
      feedbackRate,
      cacheHitRate,
      errorRate,
      daysActive,
    },
  };
}
