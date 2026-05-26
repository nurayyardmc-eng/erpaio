"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatPercent } from "@/lib/format/percent";

type Channel = "whatsapp" | "email" | "push" | "slack" | "teams" | "webhook";
type Status = "sent" | "failed" | "skipped";

interface NotificationRow {
  id: string;
  tenantId: string;
  alertId: string | null;
  channel: Channel;
  status: Status;
  recipient: string | null;
  error: string | null;
  metadata: unknown;
  createdAt: string;
  tenant: { name: string } | null;
}

interface ChannelSummary {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  successRate: number;
}

const STATUS_COLORS: Record<Status, string> = {
  sent: "#10B981",
  failed: "#EF4444",
  skipped: "#F59E0B",
};

const STATUS_BG: Record<Status, string> = {
  sent: "#D1FAE5",
  failed: "#FEE2E2",
  skipped: "#FEF3C7",
};

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [summary, setSummary] = useState<Record<string, ChannelSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | "">("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");

  const load = (channel?: string, status?: string) => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (channel) qs.set("channel", channel);
    if (status) qs.set("status", status);

    fetch(`/api/admin/notifications?${qs.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setRows(d.recent ?? []);
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

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  const channels: Channel[] = ["whatsapp", "email", "push", "slack", "teams", "webhook"];
  const statuses: Status[] = ["sent", "failed", "skipped"];

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · NOTIFICATIONS</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>Delivery Health</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 24 }}>
        Son 24h notification attempt&apos;leri. NotificationLog 180 gün retention,
        eski kayıtlar cleanup cron&apos;da silinir.
      </p>

      {/* Channel summary */}
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Channel breakdown (son 24h)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
        {Object.entries(summary).length === 0 ? (
          <div style={{ color: "#737373", fontSize: 13 }}>Son 24 saatte gönderim yok.</div>
        ) : (
          Object.entries(summary).map(([ch, s]) => {
            const rate = s.sent + s.failed > 0 ? s.successRate : 0;
            const healthColor =
              rate >= 0.95 ? "#10B981" :
              rate >= 0.8  ? "#F59E0B" :
              rate < 0     ? "#737373" : "#EF4444";
            return (
              <div key={ch} style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderLeft: `3px solid ${healthColor}`,
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{ch}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: healthColor }}>
                  {formatPercent(rate)}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  <span style={{ color: "#10B981" }}>✓ {s.sent}</span>
                  {" · "}
                  <span style={{ color: "#EF4444" }}>✗ {s.failed}</span>
                  {s.skipped > 0 && (
                    <>
                      {" · "}
                      <span style={{ color: "#F59E0B" }}>⊘ {s.skipped}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#94A3B8", alignSelf: "center", marginRight: 4 }}>Channel:</span>
        {(["", ...channels] as const).map((c) => (
          <button
            key={c || "all"}
            onClick={() => {
              setChannelFilter(c);
              load(c || undefined, statusFilter || undefined);
            }}
            style={pillStyle(channelFilter === c)}
          >
            {c || "Hepsi"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#94A3B8", alignSelf: "center", marginRight: 4 }}>Status:</span>
        {(["", ...statuses] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatusFilter(s);
              load(channelFilter || undefined, s || undefined);
            }}
            style={pillStyle(statusFilter === s)}
          >
            {s || "Hepsi"}
          </button>
        ))}
        {rows.length > 0 && (
          <button
            onClick={() => {
              const csvRows = rows.map((r) => ({
                time: r.createdAt,
                tenant: r.tenant?.name ?? r.tenantId,
                channel: r.channel,
                status: r.status,
                recipient: r.recipient ?? "",
                error: r.error ?? "",
                alertId: r.alertId ?? "",
              }));
              const csv = rowsToCsv(csvRows, ["time", "tenant", "channel", "status", "recipient", "error", "alertId"]);
                            downloadCsv(exportFilename("admin-notifications", "csv"), csv);
            }}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 100, fontSize: 12, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ CSV
          </button>
        )}
      </div>

      {/* Recent list */}
      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Eşleşen kayıt yok.</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={th}>Zaman</th>
                <th style={th}>Channel</th>
                <th style={th}>Status</th>
                <th style={th}>Tenant</th>
                <th style={th}>Alıcı</th>
                <th style={{ ...th, textAlign: "left" }}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={td}>{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                  <td style={td}><code style={{ fontSize: 10 }}>{r.channel}</code></td>
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
                  <td style={td}>{r.tenant?.name ?? <code style={{ fontSize: 10 }}>{r.tenantId.slice(0, 8)}</code>}</td>
                  <td style={td}>{r.recipient ?? <span style={{ color: "#94A3B8" }}>—</span>}</td>
                  <td style={{ ...td, textAlign: "left", fontSize: 10, color: r.error ? "#EF4444" : "#475569", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.error ?? (r.metadata ? JSON.stringify(r.metadata) : "")}
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

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${active ? "#0A0A0A" : "#E5E7EB"}`,
    background: active ? "#0A0A0A" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#0F172A",
    cursor: "pointer",
    fontFamily: "inherit",
  };
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
  fontSize: 12,
  color: "#0F172A",
};
