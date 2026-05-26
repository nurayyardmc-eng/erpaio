"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { colors } from "@/lib/theme";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatPercentInt } from "@/lib/format/percent";

interface LogEntry {
  id: string;
  alertId: string | null;
  channel: string;
  status: string;
  recipient: string | null;
  error: string | null;
  createdAt: string;
}

interface ChannelSummary {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  successRate: number;
}

interface LogResponse {
  recent: LogEntry[];
  summary: Record<string, ChannelSummary>;
  days: number;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  sent: { bg: "#D1FAE5", fg: "#065F46" },
  failed: { bg: "#FEE2E2", fg: "#991B1B" },
  skipped: { bg: "#F1F5F9", fg: "#475569" },
};

const CHANNEL_LABEL_TR: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  push: "Push",
  slack: "Slack",
  teams: "Teams",
  webhook: "Webhook",
};

const STATUS_LABEL_TR: Record<string, string> = {
  sent: "Gönderildi",
  failed: "Başarısız",
  skipped: "Atlandı",
};

export default function NotificationLogPage() {
  const [data, setData] = useState<LogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = (d: number) => {
    setLoading(true);
    fetch(`/api/me/notification-log?days=${d}&limit=100`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          setError(json.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  };

  useEffect(() => {
    // Initial fetch — load() sets state internally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bgSubtle, padding: 40 }}>
        <h1 style={{ fontSize: 18, color: colors.error }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca owner / admin rollerine açıktır.</p>
      </div>
    );
  }

  const summary = data?.summary ?? {};
  const recent = data?.recent ?? [];

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <Link href="/dashboard/settings" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Ayarlar
      </Link>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · BİLDİRİM LOGU
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        Bildirim Audit Trail
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 720 }}>
        Tenant&apos;ınızdan gönderilen WhatsApp/email/push/Slack/Teams/webhook bildirimleri.
        KVKK md. 13 + ePrivacy outbound communication kayıtları. 180 gün retention&apos;dan
        sonra otomatik silinir.
      </p>

      {/* Day filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[1, 7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => { setDays(d); load(d); }}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${days === d ? colors.text : colors.border}`,
              background: days === d ? colors.text : colors.card,
              color: days === d ? "#FFFFFF" : colors.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Son {d} gün
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {Object.keys(summary).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
          {Object.entries(summary).map(([ch, s]) => {
            const successPct = Number(formatPercentInt(s.successRate));
            const healthy = s.failed === 0;
            return (
              <div key={ch} style={{
                background: colors.card,
                border: `1px solid ${healthy ? colors.border : "#FECACA"}`,
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{CHANNEL_LABEL_TR[ch] ?? ch}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: "#10B981" }}>{s.sent}</span>
                  <span style={{ color: colors.textMuted, fontWeight: 400 }}> / </span>
                  <span style={{ color: s.failed > 0 ? "#EF4444" : colors.textMuted }}>{s.failed}</span>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  %{successPct} başarı · {s.total} attempt
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Track QQ — CSV export. Çoğunlukla notification debugging için
          (delivery failures audit, deliverability report). */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => {
              const rows = recent.map((r) => ({
                time: r.createdAt,
                channel: r.channel,
                status: r.status,
                recipient: r.recipient ?? "",
                error: r.error ?? "",
                alertId: r.alertId ?? "",
              }));
              const csv = rowsToCsv(rows, ["time", "channel", "status", "recipient", "error", "alertId"]);
                            downloadCsv(exportFilename("notification-log", "csv"), csv);
            }}
            style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ CSV
          </button>
        </div>
      )}

      {/* Recent list */}
      {loading ? (
        <div style={{ color: colors.textMuted, fontSize: 13 }}>Yükleniyor...</div>
      ) : recent.length === 0 ? (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, color: colors.textMuted, fontSize: 13 }}>
          Bu sürede bildirim gönderilmedi.
        </div>
      ) : (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden", maxWidth: 1100 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                <th style={th}>Kanal</th>
                <th style={th}>Durum</th>
                <th style={{ ...th, textAlign: "left" }}>Alıcı</th>
                <th style={{ ...th, textAlign: "left" }}>Hata</th>
                <th style={th}>Zaman</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.skipped;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={td}><strong>{CHANNEL_LABEL_TR[r.channel] ?? r.channel}</strong></td>
                    <td style={td}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: ss.bg,
                        color: ss.fg,
                        fontWeight: 600,
                        fontSize: 10,
                        letterSpacing: 0.5,
                      }}>{STATUS_LABEL_TR[r.status] ?? r.status}</span>
                    </td>
                    <td style={{ ...td, textAlign: "left", fontFamily: "ui-monospace, monospace", fontSize: 11, color: colors.textMuted, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.recipient ?? "—"}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontSize: 11, color: "#EF4444", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.error ?? ""}
                    </td>
                    <td style={{ ...td, fontSize: 11, color: colors.textMuted }}>
                      {new Date(r.createdAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
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
  verticalAlign: "top",
};
