import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { daysAgo } from "@/lib/time/units";

const log = childLogger({ component: "cron-health-digest" });

/**
 * Cron failure digest — son 24 saatte FAILED veya PARTIAL_FAILURE biten
 * CronRun'ları yakalayıp sysadmin'lere tek bir özet email göndermek için.
 *
 * Cleanup cron'un sonunda çağrılır (best-effort). Mevcut sistem'de cron
 * başarısızlıkları sessizce CronRun tablosuna yazılıyordu; bu modül o
 * sessizliği kırar — admin günde 1 kez (cleanup cron'la birlikte) digest
 * email alır. Daha sık şart değil: alarm fatigue önlemek için günlük tempo
 * yeterli (gerçek anlık alarm Sentry'ye düşer zaten).
 */

export type RecentFailedRun = {
  id: string;
  jobName: string;
  startedAt: Date;
  status: "FAILED" | "PARTIAL_FAILURE";
  errorMessage: string | null;
  tenantsFail: number;
  tenantsTotal: number;
};

export interface FailureSummaryByJob {
  jobName: string;
  count: number;
  latestRunId: string;
  latestStartedAt: Date;
  latestErrorMessage: string | null;
  latestStatus: "FAILED" | "PARTIAL_FAILURE";
  totalTenantsFailed: number;
}

/**
 * Pure: failed run listesini job bazlı özet'e dönüştürür. En son startedAt'i
 * "latest" olarak alır (örnek error mesajı için). count = job için toplam.
 */
export function summarizeFailedRuns(runs: RecentFailedRun[]): FailureSummaryByJob[] {
  const byJob = new Map<string, FailureSummaryByJob>();
  for (const run of runs) {
    const existing = byJob.get(run.jobName);
    if (!existing) {
      byJob.set(run.jobName, {
        jobName: run.jobName,
        count: 1,
        latestRunId: run.id,
        latestStartedAt: run.startedAt,
        latestErrorMessage: run.errorMessage,
        latestStatus: run.status,
        totalTenantsFailed: run.tenantsFail,
      });
    } else {
      existing.count++;
      existing.totalTenantsFailed += run.tenantsFail;
      // En yeni run'ı "latest" olarak tut (örnek hata mesajı için).
      if (run.startedAt.getTime() > existing.latestStartedAt.getTime()) {
        existing.latestRunId = run.id;
        existing.latestStartedAt = run.startedAt;
        existing.latestErrorMessage = run.errorMessage;
        existing.latestStatus = run.status;
      }
    }
  }
  // Stable ordering: total failure sayısı azalan, sonra job adı.
  return Array.from(byJob.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.jobName.localeCompare(b.jobName);
  });
}

/** HTML escape — error message kullanıcı girişi olmasa da defensive. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Pure: özet listeyi HTML email body'sine çevirir. Boş liste → boş string
 * (caller sendEmail çağırmamalı; ama bug'ı maskelemek yerine net döner).
 */
export function formatCronHealthDigestHtml(summary: FailureSummaryByJob[]): string {
  if (summary.length === 0) return "";

  const rows = summary
    .map((s) => {
      const errPreview = s.latestErrorMessage
        ? `<code style="background:#FEE2E2;padding:2px 4px;font-size:11px;color:#991B1B;">${escapeHtml(s.latestErrorMessage.slice(0, 200))}</code>`
        : '<span style="color:#94A3B8;font-size:11px;">(no error message)</span>';
      const statusBadge =
        s.latestStatus === "FAILED"
          ? '<span style="background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px;">FAILED</span>'
          : '<span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px;">PARTIAL</span>';
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-family:monospace;font-size:12px;">${escapeHtml(s.jobName)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;">${statusBadge}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;">${s.count}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:11px;color:#475569;">${s.totalTenantsFailed > 0 ? `${s.totalTenantsFailed} tenant` : "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:11px;color:#475569;">${s.latestStartedAt.toISOString()}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;">${errPreview}</td>
        </tr>`;
    })
    .join("");

  const totalFailures = summary.reduce((acc, s) => acc + s.count, 0);

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;background:#F9FAFB;color:#0F172A;margin:0;padding:24px;">
  <div style="max-width:760px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E5E7EB;">
    <div style="color:#0A0A0A;font-size:10px;letter-spacing:3px;margin-bottom:8px;">ERPAIO · CRON HEALTH</div>
    <h1 style="font-size:22px;margin:0 0 8px;letter-spacing:-0.5px;">Son 24 saatte ${totalFailures} cron başarısızlığı</h1>
    <p style="color:#737373;font-size:13px;line-height:1.6;margin:0 0 24px;">
      Aşağıdaki işler son 24 saatte FAILED veya PARTIAL_FAILURE durumuyla sonlandı.
      Sentry'de detaylı stack trace mevcut. Yönetici dashboard:
      <a href="https://erpaio.vercel.app/admin/cron-runs" style="color:#0A0A0A;">erpaio.vercel.app/admin/cron-runs</a>
    </p>
    <table style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;font-size:13px;">
      <thead>
        <tr style="background:#F9FAFB;border-bottom:1px solid #E5E7EB;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Job</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Latest Status</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Run Count</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Tenants Fail</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Latest Started</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Error Sample</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#94A3B8;font-size:11px;line-height:1.5;margin:24px 0 0;">
      Bu özet ERPAIO daily cleanup cron'unun bir parçasıdır.
      Notification list'ten çıkmak için SYSADMIN_NOTIFY_EMAIL env'ini kaldırın.
    </p>
  </div>
</body></html>`;
}

/**
 * DB'den son 24 saatteki FAILED / PARTIAL_FAILURE run'ları çek + format +
 * email'e gönder. Sıfır başarısızlık varsa hiç email atılmaz.
 *
 * env SYSADMIN_NOTIFY_EMAIL boşsa no-op (development'ta gürültü yapmaz).
 * Comma-separated multiple recipient destekler.
 *
 * Best-effort: hata fırlatmaz, log + Sentry'ye yazar.
 */
export async function sendCronHealthDigest(): Promise<{ ok: boolean; failuresFound: number }> {
  const recipientEnv = (process.env.SYSADMIN_NOTIFY_EMAIL ?? "").trim();
  if (!recipientEnv) {
    log.debug({}, "SYSADMIN_NOTIFY_EMAIL not set; digest skipped");
    return { ok: true, failuresFound: 0 };
  }
  const recipients = recipientEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    return { ok: true, failuresFound: 0 };
  }

  const since = daysAgo(1);
  const runs = await prisma.cronRun.findMany({
    where: { startedAt: { gt: since }, status: { in: ["FAILED", "PARTIAL_FAILURE"] } },
    select: {
      id: true,
      jobName: true,
      startedAt: true,
      status: true,
      errorMessage: true,
      tenantsFail: true,
      tenantsTotal: true,
    },
    orderBy: { startedAt: "desc" },
  });

  if (runs.length === 0) {
    log.info({}, "No cron failures in last 24h; digest skipped");
    return { ok: true, failuresFound: 0 };
  }

  // Cast Prisma enum → our pure-type strict union
  const summary = summarizeFailedRuns(
    runs.map((r) => ({
      id: r.id,
      jobName: r.jobName,
      startedAt: r.startedAt,
      status: r.status as "FAILED" | "PARTIAL_FAILURE",
      errorMessage: r.errorMessage,
      tenantsFail: r.tenantsFail,
      tenantsTotal: r.tenantsTotal,
    })),
  );

  const html = formatCronHealthDigestHtml(summary);

  try {
    await sendEmail({
      to: recipients,
      subject: `[ERPAIO] Cron health: ${runs.length} failures in last 24h`,
      html,
    });
    log.info({ recipients: recipients.length, failures: runs.length }, "Cron health digest sent");
    return { ok: true, failuresFound: runs.length };
  } catch (err) {
    log.error({ err, recipients: recipients.length }, "Cron health digest send failed");
    return { ok: false, failuresFound: runs.length };
  }
}
