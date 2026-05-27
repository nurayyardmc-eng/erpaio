import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { jsonError, localizedError } from "@/lib/i18n/server";
import {
  watchlistNotFoundError,
  sqlNotInHistoryError,
} from "@/lib/http/searchParams";
import { compareThreshold, extractFirstNumeric } from "@/lib/threshold/compare";
import { findLastSqlForQuestion } from "@/lib/chat/findLastSqlForQuestion";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Watchlist preview run — Track AA (alfabe ikinci tur). Cron günlük (Vercel
 * Hobby) çalışıyor; kullanıcı watchlist oluşturduğunda 24 saat bekleyemez.
 * Bu endpoint SQL'i bir kez çalıştırır, eşik karşılaştırması yapar, hit/no-hit
 * bilgisini döner. PERSIST ETMEZ: cron mantığının test etmesi için sade
 * preview — Watchlist.lastValue/triggeredAt değişmez, WatchlistTrigger
 * oluşmaz, Alert/email/push tetiklenmez.
 *
 * Tenant-scope: id + tenantId match check başta; başka tenant'ın watchlist'i
 * 404.
 *
 * Track ZZZZ: compare + numeric extraction → @/lib/threshold/compare.
 */

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;

  const w = await prisma.watchlist.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!w) {
    return watchlistNotFoundError(req);
  }

  // Cron'daki gibi sohbet geçmişinden SQL bul. Soru ile assistant mesajı
  // eşleşmeli — kullanıcı önce chat'te bu soruyu sormuş olmalı.
  const sqlStr = await findLastSqlForQuestion(w.tenantId, w.userId, w.question);
  if (!sqlStr) {
    return sqlNotInHistoryError(req);
  }

  let value: number | null = null;
  try {
    const rows = await queryERP(w.connectionId, sqlStr);
    value = extractFirstNumeric(rows[0]);
  } catch (err) {
    return localizedError(req, 500, {
      tr: err instanceof Error ? `SQL hatası: ${err.message}` : "SQL hatası",
      en: err instanceof Error ? `SQL error: ${err.message}` : "SQL error",
    });
  }

  if (value === null) {
    return localizedError(req, 422, {
      tr: "SQL sonucundan sayısal değer alınamadı.",
      en: "Could not extract a numeric value from the SQL result.",
    });
  }

  const wouldTrigger = compareThreshold(w.thresholdOp, value, w.thresholdVal);

  return Response.json({
    value,
    wouldTrigger,
    sql: sqlStr,
  });
}
