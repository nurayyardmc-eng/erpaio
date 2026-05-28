/**
 * Tenant-scoped ERP connection ownership check.
 *
 * Track ZZZZZZZ — 3 endpoint (scheduled-reports, custom-metrics,
 * watchlists) idential `prisma.erpConnection.findFirst` ownership-only
 * lookup yapiyordu:
 *   const conn = await prisma.erpConnection.findFirst({
 *     where: { id: body.connectionId, tenantId: session.user.tenantId },
 *     select: { id: true },
 *   });
 *   if (!conn) return localizedError(req, 404, { tr: "Bağlantı
 *     bulunamadı.", en: "Connection not found." });
 *
 * Helper bunu tek satira indirir + security-critical multi-tenant
 * boundary'i (tenantId filter) test edilebilir tek bir yerde tutar.
 *
 * Caller-side null check yerine response-or-null donerek diger
 * require*-style helper'larla uyumlu (requireOwnerOrAdmin, requireOwner).
 */
import { prisma } from "@/lib/db/prisma";
import { connectionNotFoundError } from "@/lib/http/searchParams";

export async function assertOwnedConnection(
  req: Request,
  connectionId: string,
  tenantId: string,
): Promise<Response | null> {
  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId },
    select: { id: true },
  });
  if (!conn) return connectionNotFoundError(req);
  return null;
}

/**
 * Tenant-scoped full-row ErpConnection lookup. Returns the row or null.
 *
 * Track QQQQQQQQQQQQ — connections/[id]/test inline prisma.findFirst
 * yapıyordu çünkü `conn.erpType` field'i ileride dialect picking için
 * gerekli; assertOwnedConnection sadece id select yapıyor — full row
 * cekmek için ayrı helper.
 *
 * SECURITY: tenantId scope same as assertOwnedConnection. Caller
 * null check + connectionNotFoundError(req) ile 404 dönmeli.
 */
export async function findOwnedConnection(
  connectionId: string,
  tenantId: string,
) {
  return await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId },
  });
}
