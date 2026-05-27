/**
 * Tenant + user scoped ChatSession ownership check.
 *
 * Track AAAAAAAAAAA — chat/sessions/[id] PATCH ve DELETE handler'lari
 * IDENTIK ownership-only lookup yapiyordu:
 *   const owned = await prisma.chatSession.findFirst({
 *     where: { id, tenantId: session.user.tenantId, userId: session.user.id },
 *     select: { id: true },
 *   });
 *   if (!owned) return jsonError(req, "api.notFound", 404);
 *
 * SECURITY: where clause hem tenantId hem userId scope iceriyor — bir
 * kullanicinin baska kullanicinin chat session'ina (ayni tenant icinde
 * olsa bile) erismesi engelleniyor. Tek noktada toplamak bu boundary'i
 * test-edilebilir + drift-stable kilar.
 *
 * Pattern: assertOwnedConnection (Track ZZZZZZZ) ile uyumlu. Caller
 * `const denied = await assertOwnedChatSession(...); if (denied) return
 * denied;` ile early-exit yapar.
 */
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

export async function assertOwnedChatSession(
  req: Request,
  sessionId: string,
  tenantId: string,
  userId: string,
): Promise<Response | null> {
  const owned = await prisma.chatSession.findFirst({
    where: { id: sessionId, tenantId, userId },
    select: { id: true },
  });
  if (!owned) return jsonError(req, "api.notFound", 404);
  return null;
}
