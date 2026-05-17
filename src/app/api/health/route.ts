import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface CronHealth {
  ok: boolean;
  jobs: Record<string, { runs: number; failed: number; lastRunAt: string | null }>;
}

/**
 * /api/health — public uptime check.
 * - Default: DB ping + version + env (lightweight, suitable for uptime monitors)
 * - ?deep=true: + cron health (last 24h) — public-safe aggregate (no tenant data)
 *
 * Cache-Control: no-store. Idempotent GET, suitable for HEAD checks.
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
  const deep = new URL(req.url).searchParams.get("deep") === "true";

  let dbOk = false;
  let dbLatency = 0;
  let dbError: string | undefined;

  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - t;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  let cronHealth: CronHealth | undefined;
  if (deep && dbOk) {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60_000);
      const runs = await prisma.cronRun.findMany({
        where: { startedAt: { gt: last24h } },
        select: { jobName: true, status: true, startedAt: true },
        orderBy: { startedAt: "desc" },
      });

      const jobs: Record<string, { runs: number; failed: number; lastRunAt: string | null }> = {};
      for (const r of runs) {
        if (!jobs[r.jobName]) jobs[r.jobName] = { runs: 0, failed: 0, lastRunAt: null };
        const j = jobs[r.jobName];
        j.runs++;
        if (r.status === "FAILED") j.failed++;
        if (!j.lastRunAt) j.lastRunAt = r.startedAt.toISOString();
      }

      const totalFailed = Object.values(jobs).reduce((a, j) => a + j.failed, 0);
      const totalRuns = Object.values(jobs).reduce((a, j) => a + j.runs, 0);
      // "ok" = en az bir job çalıştı ve failure rate < %50
      const ok = totalRuns > 0 && totalFailed / totalRuns < 0.5;

      cronHealth = { ok, jobs };
    } catch (err) {
      cronHealth = { ok: false, jobs: {} };
      // Cron check failure ana health'i bozmasın — DB hâlâ ok ise 200 dönmeye devam
      console.error("cron health check failed:", err);
    }
  }

  const ok = dbOk;
  const status = ok ? 200 : 503;

  return Response.json(
    {
      ok,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      checks: {
        database: { ok: dbOk, latencyMs: dbLatency, error: dbError },
        ...(cronHealth && { cron: cronHealth }),
      },
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - startedAt,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
