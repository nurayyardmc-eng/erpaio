"use client";
import { useEffect, useState } from "react";

interface DashboardMetric {
  key: string;
  label: string;
  description: string;
  schedule: "hourly" | "daily";
  latest: number | null;
  latestAt: string | null;
  previous: number | null;
  changePercent: number | null;
  sparkline: number[];
  sampleCount: number;
}

interface DashboardResponse {
  metrics: DashboardMetric[];
  generatedAt: string;
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/dashboard")
      .then((r) => r.json())
      .then((d: DashboardResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace", padding: 40 }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · OVERVIEW</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Anlık Metrikler</h1>
      <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 24 }}>
        Pre-computed — saatlik/günlük cron snapshotlarından, sıfır bekleme.
        {data && ` Son güncelleme: ${new Date(data.generatedAt).toLocaleString("tr-TR")}`}
      </p>

      {loading && <div style={{ color: "#3A4558" }}>Yükleniyor...</div>}

      {!loading && data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {data.metrics.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      )}

      {!loading && data && data.metrics.every((m) => m.latest === null) && (
        <div style={{ marginTop: 40, padding: 20, background: "#0C1018", border: "1px solid #131A26", borderRadius: 8, color: "#9AA5B4", fontSize: 12 }}>
          Henüz metrik snapshot yok. Cron job'u beklerken (saatlik 0:00, günlük 06:00) veya{" "}
          <code style={{ color: "#00E5FF" }}>/api/cron/anomaly-detection</code> manuel tetiklenebilir.
        </div>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const hasData = metric.latest !== null;
  const change = metric.changePercent;
  const changeColor =
    change === null ? "#3A4558" : change > 0 ? "#69FF47" : change < 0 ? "#FF6B6B" : "#9AA5B4";

  return (
    <div style={{
      background: "#0C1018",
      border: "1px solid #131A26",
      borderRadius: 10,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 9, color: "#3A4558", letterSpacing: 2, marginBottom: 4 }}>
          {metric.schedule === "hourly" ? "SAATLİK" : "GÜNLÜK"} · {metric.sampleCount} snapshot
        </div>
        <div style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 600 }}>{metric.label}</div>
        <div style={{ fontSize: 10, color: "#9AA5B4", marginTop: 2 }}>{metric.description}</div>
      </div>

      {hasData ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 22, color: "#00E5FF", fontWeight: 700 }}>
              {formatValue(metric.latest)}
            </div>
            {change !== null && (
              <div style={{ fontSize: 11, color: changeColor }}>
                {change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>

          {metric.sparkline.length > 1 && <Sparkline values={metric.sparkline} />}

          {metric.latestAt && (
            <div style={{ fontSize: 9, color: "#3A4558" }}>
              {new Date(metric.latestAt).toLocaleString("tr-TR")}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: "#3A4558" }}>Veri henüz yok</div>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 240;
  const h = 32;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke="#00E5FF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function formatValue(v: number | null): string {
  if (v === null) return "—";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(v);
}
