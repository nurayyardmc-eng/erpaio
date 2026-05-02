"use client";
import { useEffect, useState } from "react";

interface AuditMessage {
  id: string;
  role: string;
  content: string;
  sqlQuery: string | null;
  rowCount: number | null;
  latencyMs: number | null;
  success: boolean;
  feedback: number | null;
  createdAt: string;
  sessionId: string;
  userEmail: string;
}

export default function AuditPage() {
  const [messages, setMessages] = useState<AuditMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "user" | "assistant" | "errors">("all");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (filter === "user" || filter === "assistant") params.set("role", filter);
    if (filter === "errors") params.set("success", "false");
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoading(false);
      });
  }, [filter]);

  const exportCsv = () => {
    const rows = messages.map((m) => ({
      timestamp: m.createdAt,
      user: m.userEmail,
      role: m.role,
      content: m.content.slice(0, 500),
      sql: m.sqlQuery?.slice(0, 1000) ?? "",
      rows: m.rowCount ?? "",
      latencyMs: m.latencyMs ?? "",
      success: m.success ? "yes" : "no",
      feedback: m.feedback ?? "",
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => {
        const v = String((r as Record<string, unknown>)[h] ?? "");
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `erpaio-audit-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.csv`;
    a.click();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace", padding: 40 }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · AUDIT</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Aktivite Logu</h1>
      <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        Tenant&apos;ınızda çalıştırılan tüm sohbet sorguları. KVKK gereği erişim hakkı.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {(["all", "user", "assistant", "errors"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#00E5FF18" : "transparent",
              border: `1px solid ${filter === f ? "#00E5FF" : "#131A26"}`,
              borderRadius: 6,
              padding: "6px 12px",
              color: filter === f ? "#00E5FF" : "#9AA5B4",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {f === "all" ? "Hepsi" : f === "user" ? "Sorular" : f === "assistant" ? "SQL" : "Hatalar"}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={exportCsv}
          disabled={messages.length === 0}
          style={{
            background: "#0C1018",
            border: "1px solid #131A26",
            borderRadius: 6,
            padding: "6px 12px",
            color: "#9AA5B4",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          📥 CSV indir
        </button>
      </div>

      {loading && <div style={{ color: "#3A4558" }}>Yükleniyor...</div>}

      {!loading && messages.length === 0 && (
        <div style={{ color: "#3A4558", fontSize: 12 }}>Kayıt yok.</div>
      )}

      {messages.map((m) => (
        <div key={m.id} style={{
          background: "#0C1018",
          border: "1px solid #131A26",
          borderLeft: `2px solid ${m.role === "user" ? "#00E5FF" : m.success ? "#69FF47" : "#FF6B6B"}`,
          borderRadius: 6,
          padding: 12,
          marginBottom: 6,
          fontSize: 11,
        }}>
          <div style={{ display: "flex", gap: 8, color: "#3A4558", fontSize: 9, marginBottom: 6 }}>
            <span>{new Date(m.createdAt).toLocaleString("tr-TR")}</span>
            <span>·</span>
            <span style={{ color: "#9AA5B4" }}>{m.userEmail}</span>
            <span>·</span>
            <span style={{ color: m.role === "user" ? "#00E5FF" : "#9C8AFF" }}>{m.role}</span>
            {m.latencyMs !== null && <><span>·</span><span>{m.latencyMs}ms</span></>}
            {m.rowCount !== null && <><span>·</span><span>{m.rowCount} satır</span></>}
          </div>
          <div style={{ color: m.role === "user" ? "#E8EDF5" : "#8EC8E8", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
