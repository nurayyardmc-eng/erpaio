"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatDurationMs, formatSeconds } from "@/lib/format/duration";

interface SlowQueryRow {
  id: string;
  connectionId: string | null;
  sqlSnippet: string;
  durationMs: number;
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
  connection: { erpType: string; host: string } | null;
}

interface Summary {
  count: number;
  maxMs: number;
  avgMs: number;
}

export default function SlowQueriesPage() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<SlowQueryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minMs, setMinMs] = useState(0);

  const load = (m: number) => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (m > 0) qs.set("minMs", String(m));
    fetch(`/api/me/slow-queries?${qs.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || t.common.error);
          setLoading(false);
          return;
        }
        setRows(d.rows ?? []);
        setSummary(d.summary ?? null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t.common.error);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Initial fetch on mount — load() sets state internally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(minMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presets: { label: string; v: number }[] = [
    { label: t.slowQueries.presetAll, v: 0 },
    { label: t.slowQueries.preset5s, v: 5_000 },
    { label: t.slowQueries.preset10s, v: 10_000 },
    { label: t.slowQueries.preset30s, v: 30_000 },
  ];

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <Link href="/dashboard/settings" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← {t.common.back}
      </Link>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · {t.slowQueries.brand}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        {t.slowQueries.title}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 720 }}>
        {t.slowQueries.description}
      </p>

      {/* 24h summary */}
      {summary !== null && (
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
          {summary.count === 0 ? (
            t.slowQueries.summary24hEmpty
          ) : (
            <>
              {t.slowQueries.summary24hPrefix}{summary.count}{t.slowQueries.summary24hSeparator}
              <strong>{formatDurationMs(summary.maxMs)}</strong>
              {" · "}
              {t.slowQueries.summary24hAvgPrefix}{formatDurationMs(summary.avgMs)}
            </>
          )}
        </h2>
      )}

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {presets.map((p) => (
          <button
            key={p.v}
            onClick={() => {
              setMinMs(p.v);
              load(p.v);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${minMs === p.v ? colors.text : colors.border}`,
              background: minMs === p.v ? colors.text : colors.card,
              color: minMs === p.v ? "#FFFFFF" : colors.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        ))}
        {rows.length > 0 && (
          <button
            onClick={() => {
              /* Track RR — slow queries CSV (perf inceleme için). */
              const csvRows = rows.map((r) => ({
                time: r.createdAt,
                durationMs: r.durationMs,
                ok: String(r.ok),
                connection: r.connection ? `${r.connection.erpType}:${r.connection.host}` : "",
                sqlSnippet: r.sqlSnippet,
                error: r.errorMessage ?? "",
              }));
              const csv = rowsToCsv(csvRows, ["time", "durationMs", "ok", "connection", "sqlSnippet", "error"]);
              downloadCsv(exportFilename("slow-queries", "csv"), csv);
            }}
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid rgba(10,10,10,0.12)",
              background: "transparent",
              color: "#525252",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ↓ {t.audit.exportCsv}
          </button>
        )}
      </div>

      {/* Row list */}
      <div style={{ maxWidth: 1100 }}>
        {error ? (
          <div style={{ color: colors.error, fontSize: 13 }}>⊘ {error}</div>
        ) : loading ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>{t.common.loading}</div>
        ) : rows.length === 0 ? (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, color: colors.textMuted, fontSize: 13 }}>
            {t.slowQueries.emptyFiltered}
          </div>
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>{t.slowQueries.colDuration}</th>
                  <th style={th}>{t.slowQueries.colErp}</th>
                  <th style={{ ...th, textAlign: "left" }}>{t.slowQueries.colSql}</th>
                  <th style={th}>{t.slowQueries.colResult}</th>
                  <th style={th}>{t.slowQueries.colTime}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={td}>
                      <strong style={{ color: r.durationMs > 10_000 ? colors.error : r.durationMs > 5_000 ? colors.warning : colors.text }}>
                        {formatSeconds(r.durationMs)}
                      </strong>
                    </td>
                    <td style={td}>
                      {r.connection ? (
                        <>
                          <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{r.connection.erpType}</span>
                          <span style={{ color: colors.textSubtle, fontSize: 10, display: "block" }}>{r.connection.host}</span>
                        </>
                      ) : (
                        <span style={{ color: colors.textSubtle }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontFamily: "ui-monospace, monospace", fontSize: 11, color: colors.textMuted, maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                      }}>{r.ok ? t.slowQueries.resultOk : t.slowQueries.resultFail}</span>
                    </td>
                    <td style={{ ...td, fontSize: 11, color: colors.textMuted }}>
                      {fmtDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
