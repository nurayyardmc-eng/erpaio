/**
 * Aggregate cron run rows into the `/api/health?deep=true` summary shape.
 *
 * Extracted (Track UUUUU) from src/app/api/health/route.ts so the
 * aggregation rules can be tested without Prisma. This endpoint is hit by
 * uptime monitors; a regression in the "ok" threshold flips the public
 * health status incorrectly.
 *
 * Contract:
 *  - "ok" = at least one cron run in the window AND failure rate < 50%.
 *  - Per-job counters: total runs, failed runs (status === "FAILED"),
 *    most recent startedAt as ISO string.
 *  - Empty input → { ok: false, jobs: {} } (no runs = not healthy).
 */
export interface CronRunRow {
  jobName: string;
  status: string;
  startedAt: Date;
}

export interface CronJobSummary {
  runs: number;
  failed: number;
  lastRunAt: string | null;
}

export interface CronHealth {
  ok: boolean;
  jobs: Record<string, CronJobSummary>;
}

/** Threshold above which the cron pool is considered unhealthy (50% failures). */
export const CRON_HEALTH_MAX_FAILURE_RATE = 0.5;

export function aggregateCronHealth(runsNewestFirst: CronRunRow[]): CronHealth {
  const jobs: Record<string, CronJobSummary> = {};
  for (const r of runsNewestFirst) {
    if (!jobs[r.jobName]) jobs[r.jobName] = { runs: 0, failed: 0, lastRunAt: null };
    const j = jobs[r.jobName];
    j.runs++;
    if (r.status === "FAILED") j.failed++;
    // Input is newest-first; the first sighting of a job is the latest run.
    if (!j.lastRunAt) j.lastRunAt = r.startedAt.toISOString();
  }

  const totalFailed = Object.values(jobs).reduce((a, j) => a + j.failed, 0);
  const totalRuns = Object.values(jobs).reduce((a, j) => a + j.runs, 0);
  const ok = totalRuns > 0 && totalFailed / totalRuns < CRON_HEALTH_MAX_FAILURE_RATE;
  return { ok, jobs };
}
