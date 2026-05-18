import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";

/**
 * Tenant cron health — Track DD. Crons platform-wide global çalışır
 * (per-tenant değil), ama owner "anomaly detection son ne zaman çalıştı?"
 * "watchlist cron sağlıklı mı?" sorularını cevaplamak ister. /admin/cron-runs
 * sysadmin'di, bu endpoint owner/admin için filtered subset.
 *
 * Dönen: kullanıcıyı direkt etkileyen 3 cron için son çalışmanın status +
 * finishedAt. cleanup + trial-warnings dahil değil (back-of-house infra).
 */

const TENANT_FACING_JOBS = ["anomaly-detection", "watchlists", "scheduled-reports"] as const;
type JobName = (typeof TENANT_FACING_JOBS)[number];

interface JobHealth {
  jobName: JobName;
  status: "SUCCESS" | "PARTIAL_FAILURE" | "FAILED" | "RUNNING" | "NEVER";
  finishedAt: string | null;
  alertsCreated: number;
}

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return jsonError(req, "api.forbidden", 403);
  }

  // Her job için son run'ı paralel çek. SQL-level optimum (3 küçük query) +
  // okunabilir; LATERAL join ile single query daha hızlı olur ama Prisma'da
  // raw query gerekir, complexity buna değmez.
  const results = await Promise.all(
    TENANT_FACING_JOBS.map((jobName) =>
      prisma.cronRun.findFirst({
        where: { jobName },
        orderBy: { startedAt: "desc" },
        select: {
          status: true,
          finishedAt: true,
          alertsCreated: true,
        },
      }),
    ),
  );

  const jobs: JobHealth[] = TENANT_FACING_JOBS.map((jobName, i) => {
    const r = results[i];
    if (!r) {
      return {
        jobName,
        status: "NEVER",
        finishedAt: null,
        alertsCreated: 0,
      };
    }
    return {
      jobName,
      status: r.status,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      alertsCreated: r.alertsCreated,
    };
  });

  return Response.json({ jobs });
}
