import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { parseQuery, zNumber } from "@/lib/http/searchParams";

const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 50, int: true }),
  tenantId: z.string().min(1).max(40).optional(),
  /** Yalnızca eşik aşan trace yazıyoruz — bu daha keskin filtre. Default 0. */
  minMs: zNumber({ min: 0, max: 600_000, default: 0, int: true }),
});

/**
 * Sysadmin: SlowQueryLog listesi. Slow query observability dashboard'ı.
 * Filter'lar: tenantId, minMs. Pagination basit limit-tabanlı.
 *
 * Aggregate: son 24 saat içinde tenant-bazlı slow query sayısı + p95 latency
 * + en yavaş tek query'nin durationMs'i (perf hotspot pinpoint için).
 */
export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limit = await rateLimit(guard.userId, RATE_LIMITS.ADMIN_READ);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const where: { tenantId?: string; durationMs?: { gte: number } } = {};
  if (q.tenantId) where.tenantId = q.tenantId;
  if (q.minMs > 0) where.durationMs = { gte: q.minMs };

  const rows = await prisma.slowQueryLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      tenantId: true,
      connectionId: true,
      sqlSnippet: true,
      durationMs: true,
      ok: true,
      errorMessage: true,
      createdAt: true,
      tenant: { select: { name: true, slug: true } },
      connection: { select: { erpType: true, host: true } },
    },
  });

  // 24h summary: tenant başına slow query sayısı + maxMs (en yavaş)
  const last24h = new Date(Date.now() - 24 * 60 * 60_000);
  const recent = await prisma.slowQueryLog.groupBy({
    by: ["tenantId"],
    where: { createdAt: { gt: last24h } },
    _count: { _all: true },
    _max: { durationMs: true },
    _avg: { durationMs: true },
    orderBy: { _max: { durationMs: "desc" } },
    take: 20,
  });

  const tenantsById = new Map<string, { name: string; slug: string }>();
  if (recent.length > 0) {
    const ts = await prisma.tenant.findMany({
      where: { id: { in: recent.map((r) => r.tenantId) } },
      select: { id: true, name: true, slug: true },
    });
    for (const t of ts) tenantsById.set(t.id, { name: t.name, slug: t.slug });
  }

  return Response.json({
    rows,
    summary: recent.map((r) => ({
      tenantId: r.tenantId,
      tenantName: tenantsById.get(r.tenantId)?.name ?? null,
      tenantSlug: tenantsById.get(r.tenantId)?.slug ?? null,
      count: r._count._all,
      maxMs: r._max.durationMs ?? 0,
      avgMs: r._avg.durationMs ? Math.round(r._avg.durationMs) : 0,
    })),
    generatedAt: new Date().toISOString(),
  });
}
