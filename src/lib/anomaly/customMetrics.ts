import { prisma } from "@/lib/db/prisma";
import type { MetricQuery } from "./queries";

/**
 * Custom metrics integration — Track YYYY.
 *
 * CustomMetric Prisma model + /api/custom-metrics CRUD önceden vardı ama
 * anomaly engine bu kayıtları okumuyordu — kullanıcı oluşturduğu metric
 * asla çalışmıyordu. Bu modül DB-stored CustomMetric'leri engine'in
 * MetricQuery formatına map eder; engine static queries + tenant custom
 * queries union çalıştırır.
 *
 * Customer-özel ERP şemaları (trFatura yerine farklı tablo adları) için
 * tenant kendi metric tanımını yapabilsin diye.
 */

export interface CustomMetricRow {
  key: string;
  label: string;
  description: string | null;
  schedule: string;
  algorithm: string;
  direction: string;
  configJson: unknown;
  sql: string;
  connectionId: string;
}

export function customMetricToQuery(cm: CustomMetricRow): MetricQuery {
  // configJson Prisma'da Json | null — Record<string, unknown> tipinde
  // varsayalım (POST schema z.record(z.string(), z.unknown())). Null ise
  // undefined dön (engine optional config'i öyle ele alıyor).
  const config: Record<string, unknown> | undefined =
    cm.configJson && typeof cm.configJson === "object" && !Array.isArray(cm.configJson)
      ? (cm.configJson as Record<string, unknown>)
      : undefined;

  return {
    key: cm.key,
    label: cm.label,
    // description optional; null ise label'ı fallback olarak kullan.
    description: cm.description ?? cm.label,
    schedule: cm.schedule as MetricQuery["schedule"],
    algorithm: cm.algorithm as MetricQuery["algorithm"],
    direction: cm.direction as MetricQuery["direction"],
    config,
    sql: cm.sql,
    connectionId: cm.connectionId,
  };
}

/**
 * Tenant'ın aktif custom metric'lerini schedule'a göre filtreler ve
 * MetricQuery[] formatında döner. enabled=false olanlar dahil edilmez
 * (kullanıcı toggle ile geçici devre dışı bırakabilir).
 */
export async function getTenantCustomMetrics(
  tenantId: string,
  mode: "hourly" | "daily",
): Promise<MetricQuery[]> {
  const metrics = await prisma.customMetric.findMany({
    where: { tenantId, enabled: true, schedule: mode },
    select: {
      key: true,
      label: true,
      description: true,
      schedule: true,
      algorithm: true,
      direction: true,
      configJson: true,
      sql: true,
      connectionId: true,
    },
  });
  return metrics.map(customMetricToQuery);
}
