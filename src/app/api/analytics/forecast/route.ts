import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { linearForecast } from "@/lib/analytics/forecast";
import { jsonError, localizedError } from "@/lib/i18n/server";

const QuerySchema = z.object({
  metricKey: z.string().min(1),
  steps: z.coerce.number().int().min(1).max(60).default(7),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return localizedError(req, 400, { tr: parsed.error.issues[0].message, en: parsed.error.issues[0].message });

  const { metricKey, steps } = parsed.data;

  const baselines = await prisma.anomalyBaseline.findMany({
    where: { tenantId: session.user.tenantId, metricKey },
    orderBy: { capturedAt: "asc" },
    take: 200,
    select: { value: true, capturedAt: true },
  });

  if (baselines.length < 5) {
    return localizedError(req, 400, {
      tr: "Yetersiz veri (en az 5 snapshot gerekli, mevcut: " + baselines.length + ")",
      en: "Insufficient data (at least 5 snapshots required, current: " + baselines.length + ")",
    });
  }

  const values = baselines.map((b) => b.value);
  const result = linearForecast(values, steps);

  return Response.json({
    metricKey,
    historicalCount: baselines.length,
    historical: baselines.slice(-30).map((b) => ({ value: b.value, capturedAt: b.capturedAt })),
    forecast: result,
  });
}
