"use client";
import { useEffect, useState } from "react";
import { formatNullableN } from "@/lib/charts/format";
import { formatTimestamp } from "@/lib/format/time";
import { changeDelta } from "@/lib/format/changeDelta";
import { sparklinePoints } from "@/lib/charts/sparkline";
import SetupChecklist from "@/components/SetupChecklist";
import { useI18n } from "@/lib/i18n/context";

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
  const { t } = useI18n();
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
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.overview.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.overview.title}</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24 }}>
        {t.overview.description}
        {data && t.overview.lastUpdated(formatTimestamp(data.generatedAt))}
      </p>

      <SetupChecklist />

      {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}

      {!loading && data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {data.metrics.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      )}

      {!loading && data && data.metrics.every((m) => m.latest === null) && (
        <div style={{ marginTop: 40, padding: 20, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#475569", fontSize: 12 }}>
          {t.overview.emptyTitle}{" "}
          <code style={{ color: "#0A0A0A" }}>/api/cron/anomaly-detection</code>
        </div>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const { t } = useI18n();
  const hasData = metric.latest !== null;
  const change = metric.changePercent;
  const delta = changeDelta(change);

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 10,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: 2, marginBottom: 4 }}>
          {metric.schedule === "hourly" ? t.overview.scheduleHourly : t.overview.scheduleDaily} · {metric.sampleCount} {t.overview.snapshotSuffix}
        </div>
        <div style={{ fontSize: 12, color: "#0F172A", fontWeight: 600 }}>{metric.label}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{metric.description}</div>
      </div>

      {hasData ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 22, color: "#0A0A0A", fontWeight: 700 }}>
              {formatValue(metric.latest)}
            </div>
            {!delta.isMissing && (
              <div style={{ fontSize: 11, color: delta.color }}>
                {delta.arrow} {delta.absText}%
              </div>
            )}
          </div>

          {metric.sparkline.length > 1 && <Sparkline values={metric.sparkline} />}

          {metric.latestAt && (
            <div style={{ fontSize: 9, color: "#94A3B8" }}>
              {formatTimestamp(metric.latestAt)}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.overview.noDataYet}</div>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 240;
  const h = 32;
  const points = sparklinePoints(values, w, h);
  if (!points) return null;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke="#0A0A0A" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// formatValue moved to @/lib/charts/format → formatNullableN (Track YYYYY)
const formatValue = formatNullableN;
