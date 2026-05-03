import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { linearForecast } from "@/lib/analytics/forecast";

const QuerySchema = z.object({
  metricKey: z.string().min(1),
  steps: z.coerce.number().int().min(1).max(60).default(7),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { metricKey, steps } = parsed.data;

  const baselines = await prisma.anomalyBaseline.findMany({
    where: { tenantId: session.user.tenantId, metricKey },
    orderBy: { capturedAt: "asc" },
    take: 200,
    select: { value: true, capturedAt: true },
  });

  if (baselines.length < 5) {
    return Response.json({
      error: "Yetersiz veri (en az 5 snapshot gerekli, mevcut: " + baselines.length + ")",
    }, { status: 400 });
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
