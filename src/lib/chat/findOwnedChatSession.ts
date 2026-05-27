/**
 * Tenant + user scoped ChatSession fetch with messages eager-loaded.
 *
 * Track NNNNNNNNNNN — chat/sessions/[id] GET ve chat/sessions/[id]/export
 * IDENTIK lookup yapiyordu:
 *   const chatSession = await prisma.chatSession.findFirst({
 *     where: { id, tenantId: session.user.tenantId, userId: session.user.id },
 *     include: { messages: { orderBy: { createdAt: "asc" } } },
 *   });
 *
 * SECURITY: tenantId + userId DOUBLE-scope; sessionId tahmin edilebilir
 * olsa bile ayni tenant baska kullanicinin sohbetine erisemez.
 * `messages` eager-load asc-sorted (UI/export render order korunur).
 *
 * Iki kontrat ile uyumlu:
 *   * assertOwnedChatSession (Track AAAAAAAAAAA) — sadece var-yok check
 *   * findOwnedChatSessionWithMessages (bu) — row + messages doner
 */
import { prisma } from "@/lib/db/prisma";

type ChatSessionWithMessages = NonNullable<
  Awaited<ReturnType<typeof findOwnedChatSessionWithMessages>>
>;

export type { ChatSessionWithMessages };

export async function findOwnedChatSessionWithMessages(
  sessionId: string,
  tenantId: string,
  userId: string,
) {
  return await prisma.chatSession.findFirst({
    where: { id: sessionId, tenantId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}
