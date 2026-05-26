import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { requireOwnerOrAdmin } from "@/lib/auth/role";
import { daysAgo } from "@/lib/time/units";

/**
 * Tenant-scoped slow query görünümü — owner + admin role'leri kendi
 * tenant'larının ERP query performansını görür. KVKK md. 15 hakları
 * doğrudan kapsamı dışında (bunlar operasyonel metrikler, kişisel veri
 * değil) ama tenant ops/perf transparansı için kullanışlı.
 *
 * Sysadmin /api/admin/slow-queries'i kullanır — bu endpoint tenant scope'lu.
 */
const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 50, int: true }),
  minMs: zNumber({ min: 0, max: 600_000, default: 0, int: true }),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  const denied = requireOwnerOrAdmin(req, session.user.role, {
    tr: "Bu sayfa yalnızca owner / admin rollerine açıktır.",
    en: "This page is only available to owner / admin roles.",
  });
  if (denied) return denied;

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const where: { tenantId: string; durationMs?: { gte: number } } = {
    tenantId: session.user.tenantId,
  };
  if (q.minMs > 0) where.durationMs = { gte: q.minMs };

  const rows = await prisma.slowQueryLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      connectionId: true,
      sqlSnippet: true,
      durationMs: true,
      ok: true,
      errorMessage: true,
      createdAt: true,
      connection: { select: { erpType: true, host: true } },
    },
  });

  // Son 24h tenant özet — count + maxMs + avgMs (perf trend için)
  const last24h = daysAgo(1);
  const agg = await prisma.slowQueryLog.aggregate({
    where: { tenantId: session.user.tenantId, createdAt: { gt: last24h } },
    _count: { _all: true },
    _max: { durationMs: true },
    _avg: { durationMs: true },
  });

  return Response.json({
    rows,
    summary: {
      count: agg._count._all,
      maxMs: agg._max.durationMs ?? 0,
      avgMs: agg._avg.durationMs ? Math.round(agg._avg.durationMs) : 0,
    },
    generatedAt: new Date().toISOString(),
  });
}
