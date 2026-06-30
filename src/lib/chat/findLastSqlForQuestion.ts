/**
 * Resolve the persisted SQL for a natural-language question, by locating the
 * chat turn where that question was asked and returning its assistant SQL.
 *
 * Used by (all "watchlist / scheduled report → evaluate" paths):
 *   * cron/scheduled-reports
 *   * cron/watchlists
 *   * watchlists/[id]/run (manuel)
 *   * scheduled-reports/[id]/run (manuel)
 *
 * WHY TWO QUERIES (bug fix):
 * `persistChatExchange` stores the assistant message `content` as the SQL
 * (not the question — the question lives on the paired USER message). An
 * earlier version of this helper matched the question against the ASSISTANT
 * `content`, which is the SQL, so a natural-language question ("Bu ay toplam
 * ciro") never matched → watchlists/scheduled-reports could not resolve their
 * SQL and never fired. The mocked unit test only asserted query shape, so it
 * did not catch the semantic drift.
 *
 * Correct flow:
 *   1. Find the most-recent USER message whose content contains the first 50
 *      chars of `question` (user content IS the question).
 *   2. Return the SQL of the paired assistant turn — the first successful
 *      assistant message in that session at-or-after the user message.
 *      (persistChatExchange writes user+assistant in one transaction, so the
 *      pair shares a timestamp; `createdAt >= user.createdAt` + asc order
 *      selects exactly that paired response.)
 *
 * SECURITY: the USER lookup is scoped to `session: { tenantId, userId }`, so
 * a tenant/user can only resolve their own questions. The assistant lookup is
 * scoped by that session's id (already tenant+user-owned), preserving the
 * multi-tenant boundary.
 *
 * `question.slice(0, 50)` is a user-supplied string; Prisma `contains` runs a
 * parameterized LIKE '%...%' so there is no pattern-injection risk.
 */
import { prisma } from "@/lib/db/prisma";

export async function findLastSqlForQuestion(
  tenantId: string,
  userId: string,
  question: string,
): Promise<string | null> {
  const userMsg = await prisma.chatMessage.findFirst({
    where: {
      session: { tenantId, userId },
      role: "user",
      content: { contains: question.slice(0, 50) },
    },
    orderBy: { createdAt: "desc" },
    select: { sessionId: true, createdAt: true },
  });
  if (!userMsg) return null;

  const assistantMsg = await prisma.chatMessage.findFirst({
    where: {
      sessionId: userMsg.sessionId,
      role: "assistant",
      success: true,
      sqlQuery: { not: null },
      createdAt: { gte: userMsg.createdAt },
    },
    orderBy: { createdAt: "asc" },
    select: { sqlQuery: true },
  });
  return assistantMsg?.sqlQuery ?? null;
}
