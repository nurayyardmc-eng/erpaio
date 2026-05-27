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
}

export async function persistChatExchange(input: ChatExchangeInput): Promise<void> {
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
      },
    ],
  });
}
