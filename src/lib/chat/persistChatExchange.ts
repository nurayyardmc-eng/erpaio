/**
 * Persist a successful user-question + assistant-SQL pair to ChatMessage.
 *
 * Track GGGGGGGGGGG — chat/route + chat/stream IDENTIK createMany ile
 * 2 mesaj yaratiyordu (user role + assistant role+sqlQuery+rowCount+
 * latencyMs+success). chat/run-sql tek mesajli (assistant only) farkli
 * akis, kapsam disi.
 *
 * Bu helper sadece SUCCESS path icin. Failure (validateSQL throw,
 * queryERP throw vb) ayri error message persistance'a sahip — bu
 * helper'a dahil edilmedi.
 *
 * createMany 2-row insert: tek round-trip, atomic. UI'da turn-pair
 * birlikte gosterilir, drift olmaz.
 */
import { prisma } from "@/lib/db/prisma";

export interface ChatExchangeInput {
  sessionId: string;
  question: string;
  sql: string;
  rowCount: number;
  latencyMs: number;
  /** Truncated result snapshot restored on session reload (see ChatMessage.resultJson). */
  results?: Record<string, unknown>[];
  columns?: string[];
  total?: number;
}

/**
 * Track DDDDDDDDDDDD — chat/route createMany sonrasi assistant mesajin
 * id'sini bulmak icin ekstra findFirst yapiyordu. createMany Prisma'da
 * created row id'lerini DONMUYOR (PostgreSQL connector kisitlamasi).
 * Helper bu lookup'i kapsuller; caller assistant message id'sini
 * isterse persist sonucundan alir.
 */
// Cap the persisted result snapshot — a very wide result (few rows, many/large
// columns) could still be large even after row truncation. Over the cap we drop
// the snapshot (reload falls back to SQL-only) rather than store hundreds of KB.
const RESULT_SNAPSHOT_MAX = 200_000; // ~200 KB

export async function persistChatExchange(
  input: ChatExchangeInput,
): Promise<{ assistantMessageId: string | null }> {
  let resultJson: string | null = null;
  if (input.results) {
    const snap = JSON.stringify({
      results: input.results,
      columns: input.columns ?? [],
      total: input.total ?? input.rowCount,
    });
    resultJson = snap.length <= RESULT_SNAPSHOT_MAX ? snap : null;
  }

  await prisma.chatMessage.createMany({
    data: [
      { sessionId: input.sessionId, role: "user", content: input.question },
      {
        sessionId: input.sessionId,
        role: "assistant",
        content: input.sql,
        sqlQuery: input.sql,
        rowCount: input.rowCount,
        latencyMs: input.latencyMs,
        success: true,
        resultJson,
      },
    ],
  });

  const assistantMsg = await prisma.chatMessage.findFirst({
    where: { sessionId: input.sessionId, role: "assistant" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return { assistantMessageId: assistantMsg?.id ?? null };
}
