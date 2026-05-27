/**
 * Tenant-scoped lookup of an active ERP connection with chat-relevant fields.
 *
 * Track AAAAAAAAAAAA (12-letter alphabet basladi) — chat/route +
 * chat/stream IDENTIK pattern kullaniyordu:
 *   await prisma.erpConnection.findFirst({
 *     where: { id: connectionId, tenantId, status: "active" },
 *     select: { id: true, erpType: true, erpProfile: true },
 *   });
 *
 * SECURITY: tenantId scope ile cross-tenant erisim engelleniyor;
 * status: "active" paused/disabled connection'lari filtre disi birakir.
 *
 * chat/run-sql ayni filter'i kullaniyor ama select alani daha genis
 * (full row); kapsam disi tutuldu (intentional - SQL execution baska
 * connection fields kullaniyor).
 */
import { prisma } from "@/lib/db/prisma";

export interface ActiveChatConnection {
  id: string;
  erpType: string;
  erpProfile: string | null;
}

export async function findActiveErpConnectionForChat(
  connectionId: string,
  tenantId: string,
): Promise<ActiveChatConnection | null> {
  return await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId, status: "active" },
    select: { id: true, erpType: true, erpProfile: true },
  });
}
