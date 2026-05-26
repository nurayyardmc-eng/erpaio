"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { showToast } from "@/components/Toaster";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatDurationMs } from "@/lib/format/duration";

const TRIGGER_JOBS = [
  { jobName: "anomaly-detection", path: "/api/cron/anomaly-detection" },
  { jobName: "watchlists", path: "/api/cron/watchlists" },
  { jobName: "scheduled-reports", path: "/api/cron/scheduled-reports" },
  { jobName: "cleanup", path: "/api/cron/cleanup" },
  { jobName: "trial-warnings", path: "/api/cron/trial-warnings" },
] as const;

interface CronRun {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  status: "RUNNING" | "SUCCESS" | "PARTIAL_FAILURE" | "FAILED";
  tenantsTotal: number;
  tenantsOk: number;
  tenantsFail: number;
  alertsCreated: number;
  errorMessage: string | null;
  durationMs: number | null;
}

interface JobSummary {
  total: number;
  success: number;
  failed: number;
  partial: number;
  running: number;
}

const STATUS_COLORS: Record<CronRun["status"], string> = {
  SUCCESS: "#10B981",
  PARTIAL_FAILURE: "#F59E0B",
  FAILED: "#EF4444",
  RUNNING: "#3B82F6",
};

const STATUS_BG: Record<CronRun["status"], string> = {
  SUCCESS: "#D1FAE5",
  PARTIAL_FAILURE: "#FEF3C7",
  FAILED: "#FEE2E2",
  RUNNING: "#DBEAFE",
};

export default function CronRunsPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [summary, setSummary] = useState<Record<string, JobSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [triggering, setTriggering] = useState<string | null>(null);

  const load = (filter?: string) => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (filter) qs.set("status", filter);

    fetch(`/api/admin/cron-runs?${qs.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setRuns(d.runs ?? []);
        setSummary(d.summary ?? {});
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  };

  // Initial fetch on mount — load() does setState internally.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  /**
   * Track JJ — manuel cron trigger. Sysadmin session ile verifyCronAuth
   * geçer (cron-secret bypass). Cron route long-running olabilir (5dk);
   * await edip beklemiyoruz — fire-and-forget + 2s sonra list refresh
   * (RUNNING entry görünür).
   */
  const trigger = (jobName: string, path: string) => {
    if (triggering) return;
    setTriggering(jobName);
    fetch(path).catch(() => {});
    showToast(`${jobName} tetiklendi`, "success");
    setTimeout(() => {
      setTriggering(null);
      load(statusFilter || undefined);
    }, 2500);
  };

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · CRON HEALTH</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px", letterSpacing: -0.5 }}>Cron Run Geçmişi</h1>

      {/* Manuel trigger — Track JJ */}
      <div style={{ marginBottom: 24, padding: 16, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#475569", margin: "0 0 12px" }}>
          Manuel Çalıştır
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TRIGGER_JOBS.map((j) => (
            <button
              key={j.jobName}
              onClick={() => trigger(j.jobName, j.path)}
              disabled={triggering !== null}
              style={{
                padding: "8px 16px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid #0A0A0A20",
                background: triggering === j.jobName ? "#0A0A0A" : "#FAFAF8",
                color: triggering === j.jobName ? "#FAFAF8" : "#0A0A0A",
                cursor: triggering ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: triggering && triggering !== j.jobName ? 0.4 : 1,
              }}
            >
              {triggering === j.jobName ? "..." : j.jobName} ▶
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "8px 0 0" }}>
          Sysadmin yetkisi gerekir. Cron lock duplicate run&apos;ları engeller; halihazırda çalışan job için 409 döner.
        </p>
      </div>

      {/* Son 24h özet */}
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Son 24 saat — özet</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
        {Object.entries(summary).length === 0 ? (
          <div style={{ color: "#737373", fontSize: 13 }}>Son 24 saatte cron çalışması yok.</div>
        ) : (
          Object.entries(summary).map(([jobName, s]) => {
            const healthy = s.failed === 0;
            return (
              <div key={jobName} style={{
                background: "#FFFFFF",
                border: `1px solid ${healthy ? "#E5E7EB" : "#FEE2E2"}`,
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{jobName}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{s.total}</div>
                <div style={{ fontSize: 11, color: "#737373", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#10B981" }}>✓ {s.success}</span>
                  {s.partial > 0 && <span style={{ color: "#F59E0B" }}>⚠ {s.partial}</span>}
                  {s.failed > 0 && <span style={{ color: "#EF4444" }}>✗ {s.failed}</span>}
                  {s.running > 0 && <span style={{ color: "#3B82F6" }}>● {s.running}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["", "SUCCESS", "PARTIAL_FAILURE", "FAILED", "RUNNING"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatusFilter(s);
              load(s || undefined);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${statusFilter === s ? "#0A0A0A" : "#E5E7EB"}`,
              background: statusFilter === s ? "#0A0A0A" : "#FFFFFF",
              color: statusFilter === s ? "#FFFFFF" : "#0F172A",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {s || "Hepsi"}
          </button>
        ))}
        {runs.length > 0 && (
          <button
            onClick={() => {
              /* Track VV — cron runs CSV. */
              const csvRows = runs.map((r) => ({
                jobName: r.jobName,
                status: r.status,
                startedAt: r.startedAt,
                finishedAt: r.finishedAt ?? "",
                durationMs: r.durationMs ?? "",
                tenantsTotal: r.tenantsTotal,
                tenantsOk: r.tenantsOk,
                tenantsFail: r.tenantsFail,
                alertsCreated: r.alertsCreated,
                errorMessage: r.errorMessage ?? "",
              }));
              const csv = rowsToCsv(csvRows, ["jobName", "status", "startedAt", "finishedAt", "durationMs", "tenantsTotal", "tenantsOk", "tenantsFail", "alertsCreated", "errorMessage"]);
                            downloadCsv(exportFilename("cron-runs", "csv"), csv);
            }}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 100, fontSize: 12, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ CSV
          </button>
        )}
      </div>

      {/* Run list */}
      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : runs.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Eşleşen run yok.</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={th}>Job</th>
                <th style={th}>Status</th>
                <th style={th}>Başladı</th>
                <th style={th}>Süre</th>
                <th style={th}>Tenant</th>
                <th style={th}>Alert</th>
                <th style={{ ...th, textAlign: "left" }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={td}><code style={{ fontSize: 11 }}>{r.jobName}</code></td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: STATUS_BG[r.status],
                      color: STATUS_COLORS[r.status],
                      fontWeight: 600,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}>{r.status}</span>
                  </td>
                  <td style={td}>{new Date(r.startedAt).toLocaleString("tr-TR")}</td>
                  <td style={td}>{formatDurationMs(r.durationMs)}</td>
                  <td style={td}>{r.tenantsOk}/{r.tenantsTotal}{r.tenantsFail > 0 ? <span style={{ color: "#EF4444" }}> ({r.tenantsFail} fail)</span> : null}</td>
                  <td style={td}>{r.alertsCreated || "—"}</td>
                  <td style={{ ...td, textAlign: "left", fontSize: 11, color: "#EF4444", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.errorMessage ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontWeight: 600,
  fontSize: 11,
  color: "#475569",
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontSize: 13,
  color: "#0F172A",
};
