import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { METRIC_QUERIES } from "@/lib/anomaly/queries";
import { jsonError } from "@/lib/i18n/server";
import { daysAgo } from "@/lib/time/units";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const tenantId = session.user.tenantId;

  const since = daysAgo(1);
  const baselines = await prisma.anomalyBaseline.findMany({
    where: { tenantId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { metricKey: true, value: true, capturedAt: true },
  });

  const grouped: Record<string, { value: number; capturedAt: Date }[]> = {};
  for (const b of baselines) {
    if (!grouped[b.metricKey]) grouped[b.metricKey] = [];
    grouped[b.metricKey].push({ value: b.value, capturedAt: b.capturedAt });
  }

  const metrics = METRIC_QUERIES.map((q) => {
    const series = grouped[q.key] ?? [];
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];

    return {
      key: q.key,
      label: q.label,
      description: q.description,
      schedule: q.schedule,
      latest: latest?.value ?? null,
      latestAt: latest?.capturedAt ?? null,
      previous: previous?.value ?? null,
      changePercent:
        previous && previous.value !== 0 && latest
          ? ((latest.value - previous.value) / previous.value) * 100
          : null,
      sparkline: series.map((s) => s.value).slice(-48),
      sampleCount: series.length,
    };
  });

  return Response.json({ metrics, generatedAt: new Date().toISOString() });
}
