import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";

/**
 * Saved query (QueryCache) silme — Track KKK. Eski/stale saved query'leri
 * kullanıcı temizleyebilsin. Tenant-scoped updateMany count: 0 → 404.
 *
 * Hard delete (önce trash'a göndermek yerine). QueryCache reliability metric'i
 * için kalıcı tutmaya gerek yok; user explicitly silmek istediyse niyeti net.
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;
  const result = await prisma.queryCache.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  if (result.count === 0) {
    return localizedError(req, 404, {
      tr: "Sorgu bulunamadı.",
      en: "Query not found.",
    });
  }
  return Response.json({ ok: true });
}
