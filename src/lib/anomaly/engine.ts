import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { getPool } from "@/lib/db/connector";
import {
  detectZScore, detectMovingAverage, detectThreshold,
  type AnomalyResult,
} from "./detectors";
import { getHourlyQueries, getDailyQueries, type MetricQuery } from "./queries";
import { getTenantCustomMetrics } from "./customMetrics";
import { sendWhatsApp, formatAlert, shouldNotify } from "@/lib/notifications/whatsapp";
import { sendPushToTenant } from "@/lib/notifications/push";
import { sendEmail, alertEmailHtml } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { errorMessage } from "@/lib/errors/errorMessage";
import { daysAgo } from "@/lib/time/units";
import {
  FP_SUPPRESS_WINDOW_DAYS,
  shouldSuppressByFpCount,
} from "./suppression";
import { extractMetricValue } from "./extractMetricValue";

export interface TenantRunResult {
  tenantId: string;
  metricsRun: number;
  anomaliesFound: number;
  alertsCreated: number;
  /** Eşiği aşan FP geçmişi nedeniyle suppress edilen anomaly sayısı. */
  alertsSuppressed: number;
  errors: Array<{ metric: string; error: string }>;
}

export async function runAnomalyDetectionForTenant(
  tenantId: string,
  mode: "hourly" | "daily",
): Promise<TenantRunResult> {
  const log = childLogger({ component: "anomaly-engine", tenantId, mode });
  const result: TenantRunResult = {
    tenantId,
    metricsRun: 0,
    anomaliesFound: 0,
    alertsCreated: 0,
    alertsSuppressed: 0,
    errors: [],
  };

  const staticQueries = mode === "hourly" ? getHourlyQueries() : getDailyQueries();
  // Track YYYY — DB-stored tenant custom metrics merged into engine loop.
  // Static = ERPAIO platform geneli; custom = tenant-özel.
  const customQueries = await getTenantCustomMetrics(tenantId, mode);
  const queries = [...staticQueries, ...customQueries];

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      whatsappTo: true,
      whatsappEnabled: true,
      emailTo: true,
      emailEnabled: true,
      alertMinSeverity: true,
      connections: { where: { status: "active" }, take: 1, select: { id: true } },
    },
  });

  const erpConnection = tenant?.connections[0];

  if (!erpConnection) {
    result.errors.push({ metric: "_setup", error: "No active ERP connection" });
    return result;
  }

  for (const query of queries) {
    try {
      // Track YYYY — custom metrics kendi connectionId'lerini taşır; static
      // metrics tenant'ın ilk aktif connection'ını kullanır.
      const connId = query.connectionId ?? erpConnection.id;
      const metricValue = await executeMetricQuery(connId, query);
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

        // FP suppression check — son 30 günde aynı metricKey için 3+ FP varsa,
        // bu anomaly'yi YARATMA (kullanıcı zaten "bu yanlış alarm" diye
        // işaretlemiş). Engine learning loop kapanışı.
        const fpSince = daysAgo(FP_SUPPRESS_WINDOW_DAYS);
        const fpCount = await prisma.alert.count({
          where: {
            tenantId,
            metricKey: query.key,
            falsePositiveAt: { gt: fpSince },
          },
        });
        if (shouldSuppressByFpCount(fpCount)) {
          result.alertsSuppressed++;
          log.info(
            { metricKey: query.key, fpCount, windowDays: FP_SUPPRESS_WINDOW_DAYS },
            "Anomaly suppressed by FP feedback",
          );
          continue;
        }

        const alert = await prisma.alert.create({
          data: {
            tenantId,
            type: "anomaly",
            severity: anomaly.severity,
            title: query.label,
            description: anomaly.message,
            metricKey: query.key,
            evidence: {
              metricKey: query.key,
              algorithm: anomaly.algorithm,
              score: anomaly.score,
              context: anomaly.context,
              // Feature 3.1 — structured form for locale-aware rendering at view time.
              messageKey: anomaly.messageKey,
              messageParams: anomaly.messageParams,
            } as object,
          },
        });
        result.alertsCreated++;

        if (tenant && shouldNotify(anomaly.severity, tenant.alertMinSeverity)) {
          if (tenant.whatsappEnabled) {
            try {
              const text = formatAlert({
                severity: alert.severity,
                title: alert.title,
                description: alert.description,
              });
              await sendWhatsApp(text, { to: tenant.whatsappTo ?? undefined });
            } catch (waErr) {
              log.error({ err: waErr, severity: anomaly.severity }, "WhatsApp send failed");
              Sentry.captureException(waErr, {
                tags: { component: "anomaly-engine", subsystem: "whatsapp" },
                extra: { tenantId, metricKey: query.key, severity: anomaly.severity },
              });
            }
          }

          sendPushToTenant(tenantId, {
            category: "anomaly",
            title: `${anomaly.severity.toUpperCase()} · ${alert.title}`,
            body: alert.description ?? alert.title,
            data: { alertId: alert.id, severity: alert.severity, type: "anomaly" },
          }).catch(() => {});

          if (tenant.emailEnabled && tenant.emailTo) {
            sendEmail({
              to: tenant.emailTo,
              subject: `[ERPAIO ${anomaly.severity.toUpperCase()}] ${alert.title}`,
              html: alertEmailHtml({ severity: anomaly.severity, title: alert.title, description: alert.description }),
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      const errorMsg = errorMessage(err);
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

  const r = extractMetricValue(row);
  if (!r.ok) {
    const msg =
      r.reason === "missing"
        ? "returned no rows or null metric_value"
        : "returned non-numeric metric_value";
    throw new Error(`Query "${query.key}" ${msg}`);
  }
  return r.value;
}

// Exported for test (Track MMMM). Pure algorithm dispatcher.
export function runDetector(
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
