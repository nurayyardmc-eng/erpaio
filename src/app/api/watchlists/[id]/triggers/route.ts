import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError, localizedError } from "@/lib/i18n/server";

/**
 * Watchlist trigger history — Track NNNN. Son N tetiklenmeyi listeler
 * (DESC sort). Tenant-scope: watchlist mevcut tenant'a ait değilse 404.
 *
 * Limit hardcoded 50 (cron 90 gün retention zaten arka tarafta — ortalama
 * bir watchlist günde ~1 hit ettiğinde 50 tetiklenme ≈ 50 günlük tarih).
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;

  // Önce watchlist'in bu tenant'a ait olduğunu doğrula — başka tenant'ın
  // id'si bilinse bile trigger history sızdırılmasın.
  const watchlist = await prisma.watchlist.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!watchlist) {
    return localizedError(req, 404, {
      tr: "Watchlist bulunamadı.",
      en: "Watchlist not found.",
    });
  }

  const triggers = await prisma.watchlistTrigger.findMany({
    where: { watchlistId: id },
    orderBy: { triggeredAt: "desc" },
    take: 50,
    select: {
      id: true,
      value: true,
      thresholdOp: true,
      thresholdVal: true,
      triggeredAt: true,
    },
  });

  return Response.json({ triggers });
}
