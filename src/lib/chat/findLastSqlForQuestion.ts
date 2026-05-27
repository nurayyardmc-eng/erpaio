/**
 * Lookup the most-recent successful assistant message whose content contains
 * the first 50 chars of `question` — return its persisted SQL (or null).
 *
 * Track TTTTTTTTTT — 4 sites yapiyordu ayni prisma.chatMessage.findMany:
 *   * cron/scheduled-reports
 *   * cron/watchlists
 *   * watchlists/[id]/run (manuel)
 *   * scheduled-reports/[id]/run (manuel)
 *
 * SECURITY: tenantId + userId her ikisi de session.* filtresinde — bir
 * tenant'in/user'in baska tenant/user verisine erismesi tek noktada
 * engelleniyor. content.contains 50-char prefix match'i bu route'lar
 * icin tutarli olmali — drift ederse audit log korelasyonu bozulur.
 *
 * NOT: `question.slice(0, 50)` user-supplied string'in ilk 50 char'i.
 * Prisma'nin `contains` filtresi LIKE '%...%' (case-sensitive in Postgres
 * by default) calistirir; pattern injection riski yok cunku parametre.
 */
import { prisma } from "@/lib/db/prisma";

export async function findLastSqlForQuestion(
  tenantId: string,
  userId: string,
  question: string,
): Promise<string | null> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      session: { tenantId, userId },
      role: "assistant",
      success: true,
      content: { contains: question.slice(0, 50) },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { sqlQuery: true },
  });
  return messages[0]?.sqlQuery ?? null;
}
