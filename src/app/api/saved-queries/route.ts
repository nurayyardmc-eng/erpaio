import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { computeReliability } from "@/lib/cache/reliability";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const cached = await prisma.queryCache.findMany({
    where: {
      tenantId: session.user.tenantId,
      successCount: { gte: 2 },
    },
    // Track EEEE: pinned sorgular önce; aynı pin durumunda lastUsedAt desc.
    orderBy: [{ pinned: "desc" }, { lastUsedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      question: true,
      sqlQuery: true,
      successCount: true,
      failCount: true,
      pinned: true,
      lastUsedAt: true,
    },
  });

  return Response.json({
    queries: cached.map((q) => ({
      ...q,
      reliability: computeReliability(q.successCount, q.failCount),
    })),
  });
}
