"use client";
import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useI18n } from "@/lib/i18n/context";

interface Connection { id: string; dbName: string; status: string; erpProfile: string | null; erpType: string }
interface InferredFk { fromTable: string; fromColumn: string; toTable: string; toColumn: string; occurrences: number }
interface CustomItem { type: "table" | "column"; table: string; column?: string; dataType?: string; reason: string }
interface InsightsResp { inferredForeignKeys: InferredFk[]; customItems: CustomItem[] }

export default function InsightsPage() {
  const { t } = useI18n();
  const [conns, setConns] = useState<Connection[]>([]);
  const [connsLoading, setConnsLoading] = useState(true);
  const [connsError, setConnsError] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<InsightsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadConns = () => {
    setConnsLoading(true);
    setConnsError(false);
    fetch("/api/connections")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((cs: Connection[]) => {
        const active = cs.filter(c => c.status === "active");
        setConns(active);
        if (active.length > 0) setSelected(active[0].id);
        setConnsLoading(false);
      })
      .catch(() => {
        setConnsError(true);
        setConnsLoading(false);
      });
  };

  // Mount-only fetch of connection list; loadConns sets state via async fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(loadConns, []);

  const loadInsights = () => {
    if (!selected) return;
    setLoading(true);
    setError(false);
    fetch(`/api/erp-insights?connectionId=${selected}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: InsightsResp) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  // Reload insights when user picks a different connection; loadInsights hydrates state via fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(loadInsights, [selected]);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.insights.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.insights.title}</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        {t.insights.description}
      </p>

      {connsError && <ErrorState onRetry={loadConns} />}

      {!connsLoading && !connsError && conns.length === 0 && (
        <EmptyState
          icon={<Database size={28} />}
          title={t.insights.noActiveConnTitle}
          description={t.insights.noActiveConnDesc}
        />
      )}

      {conns.length > 0 && (
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", color: "#0F172A", fontSize: 11, fontFamily: "inherit", marginBottom: 24 }}
        >
          {conns.map(c => <option key={c.id} value={c.id}>{c.dbName}</option>)}
        </select>
      )}

      {loading && <div style={{ color: "#94A3B8" }}>{t.insights.analyzing}</div>}

      {!loading && error && <ErrorState onRetry={loadInsights} />}

      {!error && data && (
        <>
          <Section title={`${t.insights.inferredFkTitle} (${data.inferredForeignKeys.length})`} desc={t.insights.inferredFkDesc}>
            {data.inferredForeignKeys.length === 0 && (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>{t.insights.inferredFkEmpty}</div>
            )}
            {data.inferredForeignKeys.slice(0, 25).map((fk, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: 10, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8EC8E8" }}>
                  {fk.fromTable}.{fk.fromColumn} = {fk.toTable}.{fk.toColumn}
                </span>
                <span style={{ color: "#9C8AFF" }}>{fk.occurrences}{t.insights.inferredFkUsageSuffix}</span>
              </div>
            ))}
          </Section>

          <Section title={`${t.insights.customItemsTitle} (${data.customItems.length})`} desc={t.insights.customItemsDesc}>
            {data.customItems.length === 0 && (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>{t.insights.customItemsEmpty}</div>
            )}
            {data.customItems.slice(0, 50).map((c, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: 10, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: c.type === "table" ? "#F59E0B" : "#F59E0B" }}>
                    {c.type === "table" ? "📋" : "🔹"} {c.table}{c.column ? `.${c.column}` : ""}
                    {c.dataType && <span style={{ color: "#94A3B8", marginLeft: 8 }}>({c.dataType})</span>}
                  </div>
                  <div style={{ color: "#475569", fontSize: 9, marginTop: 2 }}>{c.reason}</div>
                </div>
                <a
                  href={`/dashboard/annotations?prefill_table=${encodeURIComponent(c.table)}${c.column ? `&prefill_column=${encodeURIComponent(c.column)}` : ""}`}
                  style={{ background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 4, padding: "3px 10px", color: "#0A0A0A", fontSize: 10, textDecoration: "none" }}
                >
                  {t.insights.addAnnotation}
                </a>
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32, maxWidth: 760 }}>
      <h2 style={{ fontSize: 14, color: "#0A0A0A", marginBottom: 4 }}>{title}</h2>
      <p style={{ color: "#94A3B8", fontSize: 10, marginBottom: 12 }}>{desc}</p>
      {children}
    </section>
  );
}
