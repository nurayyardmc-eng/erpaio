import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { jsonError, localizedError } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Custom metric preview run — Track BB. AA pattern'ı custom metrics için.
 * Owner POST /api/custom-metrics ile metric tanımlıyor; cron sonraki run'da
 * (saatlik/günlük) çalıştırıyor. SQL syntax error / metric_value missing
 * gibi sorunlar cron'a kadar görünmüyor. Bu endpoint anlık doğrulama.
 *
 * PERSIST ETMEZ: AnomalyBaseline insert yok, Alert oluşmaz. Sadece
 * metric_value değerini döner; anomaly detector çalışmaz (cron'un işi).
 *
 * Role gate: POST/DELETE endpoint'leri ile aynı (owner/admin).
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return localizedError(req, 403, { tr: "Yalnızca admin.", en: "Admin only." });
  }

  const { id } = await context.params;

  const m = await prisma.customMetric.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { sql: true, connectionId: true, key: true, label: true },
  });
  if (!m) {
    return localizedError(req, 404, {
      tr: "Metric bulunamadı.",
      en: "Metric not found.",
    });
  }

  try {
    const rows = await queryERP(m.connectionId, m.sql);
    const row = rows[0];
    if (!row) {
      return localizedError(req, 422, {
        tr: "SQL hiç satır döndürmedi.",
        en: "SQL returned no rows.",
      });
    }
    // CustomMetric SQL schema POST'ta validate: metric_value (veya value/val)
    // kolonu zorunlu. cron executeMetricQuery row.metric_value bekler, ama
    // POST regex value/val da kabul ediyordu. Burada üçünü de dene.
    const raw = row.metric_value ?? row.value ?? row.val;
    if (raw === undefined || raw === null) {
      return localizedError(req, 422, {
        tr: "SQL sonucunda metric_value kolonu bulunamadı.",
        en: "SQL result missing metric_value column.",
      });
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      return localizedError(req, 422, {
        tr: "metric_value sayısal değil.",
        en: "metric_value is not numeric.",
      });
    }
    return Response.json({ value, key: m.key, label: m.label });
  } catch (err) {
    return localizedError(req, 500, {
      tr: err instanceof Error ? `SQL hatası: ${err.message}` : "SQL hatası",
      en: err instanceof Error ? `SQL error: ${err.message}` : "SQL error",
    });
  }
}
