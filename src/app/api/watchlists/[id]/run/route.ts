import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { jsonError, localizedError } from "@/lib/i18n/server";

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
 */
function compare(op: string, a: number, b: number): boolean {
  switch (op) {
    case "lt": return a < b;
    case "lte": return a <= b;
    case "gt": return a > b;
    case "gte": return a >= b;
    case "eq": return a === b;
    default: return false;
  }
}

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
    return localizedError(req, 404, {
      tr: "Watchlist bulunamadı.",
      en: "Watchlist not found.",
    });
  }

  // Cron'daki gibi sohbet geçmişinden SQL bul. Soru ile assistant mesajı
  // eşleşmeli — kullanıcı önce chat'te bu soruyu sormuş olmalı.
  const messages = await prisma.chatMessage.findMany({
    where: {
      session: { tenantId: w.tenantId, userId: w.userId },
      role: "assistant",
      success: true,
      content: { contains: w.question.slice(0, 50) },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { sqlQuery: true },
  });

  const sqlStr = messages[0]?.sqlQuery;
  if (!sqlStr) {
    return localizedError(req, 422, {
      tr: "Bu soru için chat geçmişinde SQL bulunamadı. Önce sohbette soruyu sorun.",
      en: "No SQL found in chat history for this question. Ask it in chat first.",
    });
  }

  let value: number | null = null;
  try {
    const rows = await queryERP(w.connectionId, sqlStr);
    const firstRow = rows[0];
    if (firstRow) {
      const firstNumeric = Object.values(firstRow).find((v) => typeof v === "number");
      if (typeof firstNumeric === "number") {
        value = firstNumeric;
      }
    }
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

  const wouldTrigger = compare(w.thresholdOp, value, w.thresholdVal);

  return Response.json({
    value,
    wouldTrigger,
    sql: sqlStr,
  });
}
