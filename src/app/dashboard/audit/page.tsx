"use client";
import { useEffect, useState } from "react";
import { Download, ScrollText } from "lucide-react";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

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

const PAGE_SIZE = 25;

export default function AuditPage() {
  const [messages, setMessages] = useState<AuditMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "user" | "assistant" | "errors">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (filter === "user" || filter === "assistant") params.set("role", filter);
    if (filter === "errors") params.set("success", "false");
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoading(false);
        setPage(1);
      });
  }, [filter]);

  const paged = messages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · AUDIT</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Aktivite Logu</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        Tenant&apos;ınızda çalıştırılan tüm sohbet sorguları. KVKK gereği erişim hakkı.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {(["all", "user", "assistant", "errors"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#0A0A0A18" : "transparent",
              border: `1px solid ${filter === f ? "#0A0A0A" : "#E5E7EB"}`,
              borderRadius: 6,
              padding: "6px 12px",
              color: filter === f ? "#0A0A0A" : "#475569",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
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
            background: "#FFFFFF",
            border: "1px solid rgba(10,10,10,0.12)",
            borderRadius: 100,
            padding: "6px 14px",
            color: "#525252",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={14} /> CSV indir
        </button>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      )}

      {!loading && messages.length === 0 && (
        <EmptyState
          icon={<ScrollText size={28} />}
          title="Kayıt yok"
          description="Bu filtrede henüz aktivite yok. Sohbet ekranında soru sorunca buraya işlenir."
        />
      )}

      {paged.map((m) => (
        <div key={m.id} style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderLeft: `2px solid ${m.role === "user" ? "#0A0A0A" : m.success ? "#10B981" : "#EF4444"}`,
          borderRadius: 6,
          padding: 12,
          marginBottom: 6,
          fontSize: 11,
        }}>
          <div style={{ display: "flex", gap: 8, color: "#94A3B8", fontSize: 9, marginBottom: 6 }}>
            <span>{new Date(m.createdAt).toLocaleString("tr-TR")}</span>
            <span>·</span>
            <span style={{ color: "#475569" }}>{m.userEmail}</span>
            <span>·</span>
            <span style={{ color: m.role === "user" ? "#0A0A0A" : "#9C8AFF" }}>{m.role}</span>
            {m.latencyMs !== null && <><span>·</span><span>{m.latencyMs}ms</span></>}
            {m.rowCount !== null && <><span>·</span><span>{m.rowCount} satır</span></>}
          </div>
          <div style={{ color: m.role === "user" ? "#0F172A" : "#8EC8E8", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {m.content}
          </div>
        </div>
      ))}

      {!loading && messages.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={messages.length} onChange={setPage} />
      )}
    </div>
  );
}
