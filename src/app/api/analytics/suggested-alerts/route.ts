import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { METRIC_QUERIES } from "@/lib/anomaly/queries";
import { linearForecast } from "@/lib/analytics/forecast";
import { jsonError } from "@/lib/i18n/server";

interface Suggestion {
  metricKey: string;
  metricLabel: string;
  reason: string;
  recommendedThresholdOp: "lt" | "gt";
  recommendedThresholdVal: number;
  confidence: number;
}

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const baselines = await prisma.anomalyBaseline.findMany({
    where: { tenantId: session.user.tenantId, capturedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
    orderBy: { capturedAt: "asc" },
    select: { metricKey: true, value: true },
  });

  const grouped: Record<string, number[]> = {};
  for (const b of baselines) {
    if (!grouped[b.metricKey]) grouped[b.metricKey] = [];
    grouped[b.metricKey].push(b.value);
  }

  const customMetrics = await prisma.customMetric.findMany({
    where: { tenantId: session.user.tenantId, enabled: true },
    select: { key: true, label: true },
  });
  const labelMap: Record<string, string> = {};
  for (const m of METRIC_QUERIES) labelMap[m.key] = m.label;
  for (const cm of customMetrics) labelMap[cm.key] = cm.label;

  const suggestions: Suggestion[] = [];

  for (const [key, values] of Object.entries(grouped)) {
    if (values.length < 7) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];

    const forecast = linearForecast(values, 7);

    const existingWatchlists = await prisma.watchlist.count({
      where: {
        tenantId: session.user.tenantId,
        question: { contains: key },
      },
    });
    if (existingWatchlists > 0) continue;

    if (forecast.trend === "falling" && Math.abs(forecast.slope * values.length) > mean * 0.2) {
      suggestions.push({
        metricKey: key,
        metricLabel: labelMap[key] ?? key,
        reason: `Son 30 günde düşüş trendi (slope: ${forecast.slope.toFixed(2)}). Watchlist ile düşük seviyeyi yakalayın.`,
        recommendedThresholdOp: "lt",
        recommendedThresholdVal: Math.round(p10),
        confidence: 0.75,
      });
    }

    const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    const cv = mean === 0 ? 0 : stdDev / Math.abs(mean);

    if (cv > 0.5 && cv < 2) {
      suggestions.push({
        metricKey: key,
        metricLabel: labelMap[key] ?? key,
        reason: `Yüksek volatilite (CV: ${(cv * 100).toFixed(0)}%). Spike threshold önerilir.`,
        recommendedThresholdOp: "gt",
        recommendedThresholdVal: Math.round(p90),
        confidence: 0.65,
      });
    }
  }

  return Response.json({
    suggestions: suggestions.slice(0, 10),
    analyzedMetrics: Object.keys(grouped).length,
  });
}
