import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { getPool } from "@/lib/db/connector";
import {
  detectZScore, detectMovingAverage, detectThreshold,
  type AnomalyResult,
} from "./detectors";
import { getHourlyQueries, getDailyQueries, type MetricQuery } from "./queries";
import { sendWhatsApp, formatAlert } from "@/lib/notifications/whatsapp";
import { childLogger } from "@/lib/observability/logger";

export interface TenantRunResult {
  tenantId: string;
  metricsRun: number;
  anomaliesFound: number;
  alertsCreated: number;
  errors: Array<{ metric: string; error: string }>;
}

export async function runAnomalyDetectionForTenant(
  tenantId: string,
  mode: "hourly" | "daily",
): Promise<TenantRunResult> {
  const log = childLogger({ component: "anomaly-engine", tenantId, mode });
  const result: TenantRunResult = {
    tenantId, metricsRun: 0, anomaliesFound: 0, alertsCreated: 0, errors: [],
  };

  const queries = mode === "hourly" ? getHourlyQueries() : getDailyQueries();

  const erpConnection = await prisma.erpConnection.findFirst({
    where: { tenantId, status: "active" },
  });

  if (!erpConnection) {
    result.errors.push({ metric: "_setup", error: "Aktif ERP bağlantısı yok" });
    return result;
  }

  for (const query of queries) {
    try {
      const metricValue = await executeMetricQuery(erpConnection.id, query);
      result.metricsRun++;

      const now = new Date();
      const periodStart = mode === "hourly"
        ? new Date(now.getTime() - 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await prisma.anomalyBaseline.create({
        data: {
          tenantId, metricKey: query.key, value: metricValue,
          periodStart, periodEnd: now,
          metadata: { algorithm: query.algorithm, label: query.label },
        },
      });

      const historyWindow = query.historyWindow ?? 30;
      const historyRows = await prisma.anomalyBaseline.findMany({
        where: { tenantId, metricKey: query.key },
        orderBy: { capturedAt: "desc" },
        take: historyWindow + 1,
        skip: 1,
      });
      const history = historyRows.map((r) => r.value);

      const anomaly = runDetector(query, metricValue, history);

      if (anomaly.isAnomaly) {
        result.anomaliesFound++;

        const alert = await prisma.alert.create({
          data: {
            tenantId,
            type: "anomaly",
            severity: anomaly.severity,
            title: query.label,
            description: anomaly.message,
            evidence: {
              metricKey: query.key,
              algorithm: anomaly.algorithm,
              score: anomaly.score,
              context: anomaly.context,
            } as object,
          },
        });
        result.alertsCreated++;

        if (anomaly.severity === "high" || anomaly.severity === "critical") {
          try {
            const text = formatAlert({
              severity: alert.severity,
              title: alert.title,
              description: alert.description,
            });
            await sendWhatsApp(text);
          } catch (waErr) {
            log.error({ err: waErr, severity: anomaly.severity }, "WhatsApp send failed");
            Sentry.captureException(waErr, {
              tags: { component: "anomaly-engine", subsystem: "whatsapp" },
              extra: { tenantId, metricKey: query.key, severity: anomaly.severity },
            });
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.errors.push({ metric: query.key, error: errorMsg });
      log.error({ err, metricKey: query.key }, "Metric execution failed");
      Sentry.captureException(err, {
        tags: { component: "anomaly-engine", metricKey: query.key },
        extra: { tenantId, mode },
      });
    }
  }

  return result;
}

async function executeMetricQuery(
  connectionId: string,
  query: MetricQuery,
): Promise<number> {
  const pool = await getPool(connectionId);
  const result = await pool.request().query(query.sql);
  const row = result.recordset?.[0];

  if (!row || row.metric_value === undefined || row.metric_value === null) {
    throw new Error(`Query "${query.key}" returned no rows or null metric_value`);
  }

  const value = Number(row.metric_value);
  if (Number.isNaN(value)) {
    throw new Error(`Query "${query.key}" returned non-numeric metric_value`);
  }

  return value;
}

function runDetector(
  query: MetricQuery, current: number, history: number[],
): AnomalyResult {
  switch (query.algorithm) {
    case "zscore":
      return detectZScore({
        current, history, metricLabel: query.label,
        direction: query.direction,
      });
    case "moving_avg":
      return detectMovingAverage({
        current, history, metricLabel: query.label,
        direction: query.direction,
      });
    case "threshold": {
      const rules = (query.config?.rules as Array<{
        condition: "lt" | "lte" | "gt" | "gte" | "eq";
        value: number;
        severity: "low" | "medium" | "high" | "critical";
        message?: string;
      }>) ?? [];
      return detectThreshold({
        current, metricLabel: query.label, rules,
      });
    }
    default:
      throw new Error(`Bilinmeyen algoritma: ${query.algorithm}`);
  }
}
