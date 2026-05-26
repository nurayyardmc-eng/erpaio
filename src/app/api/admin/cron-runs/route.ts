import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { daysAgo } from "@/lib/time/units";

const QuerySchema = z.object({
  limit: zNumber({ min: 1, max: 200, default: 50, int: true }),
  jobName: z.string().min(1).max(80).optional(),
  status: z.enum(["RUNNING", "SUCCESS", "PARTIAL_FAILURE", "FAILED"]).optional(),
});

/**
 * Sysadmin: son cron run'larını listele. Cron health dashboard'ı için.
 * Filter'lar: jobName, status. Pagination basit limit-tabanlı (cursor değil —
 * audit log boyutu küçük kalır, retention politikası ayrı görev).
 */
export async function GET(req: Request) {
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

  const limited = await enforceUserRateLimit(req, guard.userId, RATE_LIMITS.ADMIN_READ);
  if (limited) return limited;

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const where: { jobName?: string; status?: "RUNNING" | "SUCCESS" | "PARTIAL_FAILURE" | "FAILED" } = {};
  if (q.jobName) where.jobName = q.jobName;
  if (q.status) where.status = q.status;

  const runs = await prisma.cronRun.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: q.limit,
    select: {
      id: true,
      jobName: true,
      startedAt: true,
      finishedAt: true,
      status: true,
      tenantsTotal: true,
      tenantsOk: true,
      tenantsFail: true,
      alertsCreated: true,
      errorMessage: true,
    },
  });

  // Aggregate: son 24 saatte job-bazlı özet (admin dashboard summary için)
  const last24h = daysAgo(1);
  const recent = await prisma.cronRun.groupBy({
    by: ["jobName", "status"],
    where: { startedAt: { gt: last24h } },
    _count: { _all: true },
  });

  const summary: Record<string, { total: number; success: number; failed: number; partial: number; running: number }> = {};
  for (const row of recent) {
    if (!summary[row.jobName]) {
      summary[row.jobName] = { total: 0, success: 0, failed: 0, partial: 0, running: 0 };
    }
    const s = summary[row.jobName];
    s.total += row._count._all;
    if (row.status === "SUCCESS") s.success += row._count._all;
    else if (row.status === "FAILED") s.failed += row._count._all;
    else if (row.status === "PARTIAL_FAILURE") s.partial += row._count._all;
    else if (row.status === "RUNNING") s.running += row._count._all;
  }

  return Response.json({
    runs: runs.map((r) => ({
      ...r,
      durationMs: r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null,
    })),
    summary,
    generatedAt: new Date().toISOString(),
  });
}
