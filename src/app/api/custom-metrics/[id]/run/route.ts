import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { queryERP } from "@/lib/db/connector";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { sqlExecutionError } from "@/lib/http/searchParams";
import { extractMetricValue, PREVIEW_METRIC_ALIASES } from "@/lib/anomaly/extractMetricValue";
import { requireOwnerOrAdmin } from "@/lib/auth/role";

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
  const denied = requireOwnerOrAdmin(req, session.user.role);
  if (denied) return denied;

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
    if (!rows[0]) {
      return localizedError(req, 422, {
        tr: "SQL hiç satır döndürmedi.",
        en: "SQL returned no rows.",
      });
    }
    // CustomMetric SQL schema POST'ta validate: metric_value / value / val
    // alias'larını kabul ediyor. Cron strict (sadece metric_value); preview
    // burada PREVIEW_METRIC_ALIASES ile esnek. Track SSSSS — extracted.
    const r = extractMetricValue(rows[0], PREVIEW_METRIC_ALIASES);
    if (!r.ok) {
      return localizedError(req, 422, r.reason === "missing"
        ? { tr: "SQL sonucunda metric_value kolonu bulunamadı.", en: "SQL result missing metric_value column." }
        : { tr: "metric_value sayısal değil.", en: "metric_value is not numeric." });
    }
    return Response.json({ value: r.value, key: m.key, label: m.label });
  } catch (err) {
    return sqlExecutionError(req, err);
  }
}
