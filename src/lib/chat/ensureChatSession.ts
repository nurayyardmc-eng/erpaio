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
 * SECURITY: session.create data field'i hem tenantId hem userId
 * iceriyor; bu helper tek noktada bu invariant'i koruyor (eksik
 * tenantId ile orphan session yaratilamiyor).
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
  if (sessionId) return sessionId;
  const created = await prisma.chatSession.create({
    data: { tenantId, userId, ...(title ? { title } : {}) },
  });
  return created.id;
}
