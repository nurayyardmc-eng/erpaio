import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const cached = await prisma.queryCache.findMany({
    where: {
      tenantId: session.user.tenantId,
      successCount: { gte: 2 },
    },
    orderBy: { lastUsedAt: "desc" },
    take: 50,
    select: {
      id: true,
      question: true,
      sqlQuery: true,
      successCount: true,
      failCount: true,
      lastUsedAt: true,
    },
  });

  return Response.json({
    queries: cached.map((q) => ({
      ...q,
      reliability:
        q.successCount + q.failCount > 0
          ? q.successCount / (q.successCount + q.failCount)
          : 1,
    })),
  });
}
