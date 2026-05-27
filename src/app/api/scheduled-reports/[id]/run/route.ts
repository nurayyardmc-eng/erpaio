import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { sqlNotInHistoryError } from "@/lib/http/searchParams";
import { findLastSqlForQuestion } from "@/lib/chat/findLastSqlForQuestion";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Scheduled report preview run — Track YY (AA/BB pattern). Cron günlük/
 * haftalık çalışıyor; report yeni oluşturulduğunda "sorgu çalışıyor mu,
 * email içeriği ne olacak?" sorusu için anlık önizleme.
 *
 * PERSIST YOK + EMAIL YOK: sadece SQL execute + rowCount + first 5 rows.
 * Server tarafında recordActivity da yazılmaz (cron'un yan etkisi değil).
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { id } = await context.params;
  const report = await prisma.scheduledReport.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!report) {
    return localizedError(req, 404, {
      tr: "Rapor bulunamadı.",
      en: "Report not found.",
    });
  }

  // Cron mantığı ile aynı SQL lookup.
  const sqlStr = await findLastSqlForQuestion(report.tenantId, report.userId, report.question);
  if (!sqlStr) {
    return sqlNotInHistoryError(req);
  }

  try {
    const rows = await queryERP(report.connectionId, sqlStr);
    const sample = rows.slice(0, 5);
    return Response.json({
      rowCount: rows.length,
      sample,
      columns: sample[0] ? Object.keys(sample[0]) : [],
    });
  } catch (err) {
    return localizedError(req, 500, {
      tr: err instanceof Error ? `SQL hatası: ${err.message}` : "SQL hatası",
      en: err instanceof Error ? `SQL error: ${err.message}` : "SQL error",
    });
  }
}
