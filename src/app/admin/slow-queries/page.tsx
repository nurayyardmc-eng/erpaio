"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { formatTimestamp } from "@/lib/format/time";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatDurationMs, formatSeconds } from "@/lib/format/duration";

interface SlowQueryRow {
  id: string;
  tenantId: string;
  connectionId: string | null;
  sqlSnippet: string;
  durationMs: number;
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
  tenant: { name: string; slug: string };
  connection: { erpType: string; host: string } | null;
}

interface TenantSummary {
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  count: number;
  maxMs: number;
  avgMs: number;
}

const PRESET_MIN_MS: { label: string; v: number }[] = [
  { label: "Hepsi (≥3s)", v: 0 },
  { label: "≥ 5s", v: 5_000 },
  { label: "≥ 10s", v: 10_000 },
  { label: "≥ 30s", v: 30_000 },
];

export default function SlowQueriesAdminPage() {
  const [rows, setRows] = useState<SlowQueryRow[]>([]);
  const [summary, setSummary] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minMs, setMinMs] = useState(0);
  const [tenantId, setTenantId] = useState("");

  const load = (m: number, tid: string) => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (m > 0) qs.set("minMs", String(m));
    if (tid) qs.set("tenantId", tid);
    fetch(`/api/admin/slow-queries?${qs.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setRows(d.rows ?? []);
        setSummary(d.summary ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  };

  useEffect(() => {
    // Initial fetch on mount — load() does setState internally. Subsequent
    // filter changes call load() directly, so we don't depend on minMs/tenantId.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(minMs, tenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxIn24h = useMemo(
    () => summary.reduce((acc, t) => Math.max(acc, t.maxMs), 0),
    [summary],
  );
  const totalIn24h = useMemo(
    () => summary.reduce((acc, t) => acc + t.count, 0),
    [summary],
  );

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
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · SLOW QUERY TRACE
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        ERP Slow Query Log
      </h1>
      <p style={{ color: "#737373", fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 720 }}>
        ≥ 3000ms süren ERP query&apos;leri burada görünür. SQL snippet ilk 500 karakter ile sınırlandırılır.
        Eşik altındaki sorgular log&apos;lanmaz (tablo şişmesin). Connection silinmişse ilgili satırda
        connection bilgisi boş gelir.
      </p>

      {/* Son 24h özet */}
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
        Son 24 saat · {totalIn24h} kayıt · max {formatDurationMs(maxIn24h)}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 32 }}>
        {summary.length === 0 ? (
          <div style={{ color: "#737373", fontSize: 13 }}>Son 24 saatte slow query yok 🎉</div>
        ) : (
          summary.slice(0, 12).map((s) => (
            <button
              key={s.tenantId}
              onClick={() => {
                setTenantId(s.tenantId);
                load(minMs, s.tenantId);
              }}
              style={{
                background: tenantId === s.tenantId ? "#FEF3C7" : "#FFFFFF",
                border: `1px solid ${tenantId === s.tenantId ? "#F59E0B" : "#E5E7EB"}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {s.tenantName ?? s.tenantId.slice(0, 8)}
                {s.tenantSlug && <span style={{ color: "#94A3B8", fontWeight: 400, marginLeft: 6 }}>· {s.tenantSlug}</span>}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {formatDurationMs(s.maxMs)} <span style={{ fontSize: 11, color: "#737373", fontWeight: 400 }}>(max)</span>
              </div>
              <div style={{ fontSize: 11, color: "#737373" }}>
                {s.count} query · avg {formatDurationMs(s.avgMs)}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {PRESET_MIN_MS.map((p) => (
          <button
            key={p.v}
            onClick={() => {
              setMinMs(p.v);
              load(p.v, tenantId);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${minMs === p.v ? "#0A0A0A" : "#E5E7EB"}`,
              background: minMs === p.v ? "#0A0A0A" : "#FFFFFF",
              color: minMs === p.v ? "#FFFFFF" : "#0F172A",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        ))}
        {tenantId && (
          <button
            onClick={() => {
              setTenantId("");
              load(minMs, "");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid #F59E0B",
              background: "#FEF3C7",
              color: "#92400E",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✕ Tenant filtresini kaldır
          </button>
        )}
        {rows.length > 0 && (
          <button
            onClick={() => {
              const csvRows = rows.map((r) => ({
                time: r.createdAt,
                tenant: r.tenant.name,
                durationMs: r.durationMs,
                ok: String(r.ok),
                connection: r.connection ? `${r.connection.erpType}:${r.connection.host}` : "",
                sqlSnippet: r.sqlSnippet,
                error: r.errorMessage ?? "",
              }));
              const csv = rowsToCsv(csvRows, ["time", "tenant", "durationMs", "ok", "connection", "sqlSnippet", "error"]);
              downloadCsv(exportFilename("admin-slow-queries", "csv"), csv);
            }}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 100, fontSize: 12, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ CSV
          </button>
        )}
      </div>

      {/* Row list */}
      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Bu filtrede slow query yok 🎉</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={th}>Süre</th>
                <th style={th}>Tenant</th>
                <th style={th}>ERP</th>
                <th style={{ ...th, textAlign: "left" }}>SQL Snippet</th>
                <th style={th}>Sonuç</th>
                <th style={th}>Zaman</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={td}>
                    <strong style={{ color: r.durationMs > 10_000 ? "#EF4444" : r.durationMs > 5_000 ? "#F59E0B" : "#0F172A" }}>
                      {formatSeconds(r.durationMs)}
                    </strong>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{r.tenant.name}</span>
                    <span style={{ color: "#94A3B8", fontSize: 10, display: "block" }}>{r.tenant.slug}</span>
                  </td>
                  <td style={td}>
                    {r.connection ? (
                      <>
                        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{r.connection.erpType}</span>
                        <span style={{ color: "#94A3B8", fontSize: 10, display: "block" }}>{r.connection.host}</span>
                      </>
                    ) : (
                      <span style={{ color: "#94A3B8" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "left", fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#475569", maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.sqlSnippet}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: r.ok ? "#D1FAE5" : "#FEE2E2",
                      color: r.ok ? "#10B981" : "#EF4444",
                      fontWeight: 600,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}>{r.ok ? "OK" : "FAIL"}</span>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: "#737373" }}>
                    {formatTimestamp(r.createdAt)}
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
  verticalAlign: "top",
};
