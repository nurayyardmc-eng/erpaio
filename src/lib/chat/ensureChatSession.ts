/**
 * Return the existing chat session id, or create a new ChatSession for
 * (tenantId, userId) and return its id.
 *
 * Track FFFFFFFFFFF — 3 site AYNI 6-satirlik conditional create yapiyordu:
 *   let sid = sessionId;
 *   if (!sid) {
 *     const s = await prisma.chatSession.create({
 *       data: { tenantId, userId: session.user.id, title? },
 *     });
 *     sid = s.id;
 *   }
 * Sites:
 *   * app/api/chat/route POST (main chat)
 *   * app/api/chat/stream POST (SSE chat)
 *   * app/api/chat/run-sql POST (manuel SQL — title: "Manuel SQL")
 *
 * SECURITY: a client-supplied `sessionId` is NEVER trusted — it is verified to
 * belong to (tenantId, userId) before use. Without this check a caller could
 * pass another tenant's/user's session id and have the route write its
 * ChatMessages into a foreign session (cross-tenant/cross-user injection). A
 * foreign, stale, or non-existent id falls through to creating a fresh session
 * for the real caller. session.create always carries both tenantId + userId,
 * so no orphan session can be created without a tenant.
 *
 * NOT: title null/undefined verilirse Prisma default'a duser (schema'da
 * String? optional). Caller "Manuel SQL" gibi explicit title verirse o
 * kullanilir; AI chat default'i null (UI ilk mesajdan generate eder).
 */
import { prisma } from "@/lib/db/prisma";

export async function ensureChatSession(
  sessionId: string | null | undefined,
  tenantId: string,
  userId: string,
  title?: string,
): Promise<string> {
  if (sessionId) {
    const owned = await prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
      select: { id: true },
    });
    if (owned) return owned.id;
    // foreign / stale / non-existent id → fall through and create a fresh one
  }
  const created = await prisma.chatSession.create({
    data: { tenantId, userId, ...(title ? { title } : {}) },
  });
  return created.id;
}
