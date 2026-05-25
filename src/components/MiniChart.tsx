"use client";
import type { ChartHint } from "@/lib/charts/detect";
import { formatN } from "@/lib/charts/format";

const COLORS = ["#0A0A0A", "#10B981", "#F59E0B", "#F59E0B", "#9C8AFF", "#EF4444"];

interface Props {
  hint: ChartHint;
  rows: Record<string, unknown>[];
}

export default function MiniChart({ hint, rows }: Props) {
  if (hint.type === "none" || !hint.xColumn) return null;

  if (hint.type === "line") {
    return <LineChart hint={hint} rows={rows} />;
  }
  if (hint.type === "bar") {
    return <BarChart hint={hint} rows={rows} />;
  }
  if (hint.type === "pie") {
    return <PieChart hint={hint} rows={rows} />;
  }
  return null;
}

function LineChart({ hint, rows }: Props) {
  const w = 600;
  const h = 200;
  const pad = 32;

  const yCol = hint.yColumns[0];
  const values = rows.map((r) => Number(r[yCol]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div style={chartBox}>
      <ChartHeader title={`${yCol} (${hint.xColumn ?? ""})`} reason={hint.reason} />
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 200 }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E5E7EB" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E5E7EB" />
        <polyline points={points} fill="none" stroke={COLORS[0]} strokeWidth="2" />
        <text x={pad} y={pad - 4} fill="#475569" fontSize="10">{formatN(max)}</text>
        <text x={pad} y={h - pad + 14} fill="#475569" fontSize="10">{formatN(min)}</text>
      </svg>
    </div>
  );
}

function BarChart({ hint, rows }: Props) {
  if (!hint.xColumn) return null;
  const yCol = hint.yColumns[0];
  const values = rows.map((r) => ({
    label: String(r[hint.xColumn!] ?? ""),
    value: Number(r[yCol]) || 0,
  }));
  const max = Math.max(...values.map((v) => v.value), 1);

  return (
    <div style={chartBox}>
      <ChartHeader title={`${yCol} by ${hint.xColumn}`} reason={hint.reason} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 8px" }}>
        {values.slice(0, 12).map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10 }}>
            <div style={{ width: 90, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label}</div>
            <div style={{ flex: 1, height: 16, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(v.value / max) * 100}%`, background: COLORS[0] }} />
            </div>
            <div style={{ width: 60, color: "#0F172A", fontFamily: "inherit", textAlign: "right" }}>{formatN(v.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ hint, rows }: Props) {
  if (!hint.xColumn) return null;
  const yCol = hint.yColumns[0];
  const values = rows.map((r, i) => ({
    label: String(r[hint.xColumn!] ?? ""),
    value: Number(r[yCol]) || 0,
    color: COLORS[i % COLORS.length],
  }));
  const total = values.reduce((a, b) => a + b.value, 0);
  if (total === 0) return null;

  // Build cumulative arc slices via reduce so we don't mutate a let-binding during render.
  const slices = values.reduce<Array<typeof values[number] & { start: number; end: number }>>(
    (out, v) => {
      const start = out.length > 0 ? out[out.length - 1].end : 0;
      const end = start + (v.value / total) * 360;
      out.push({ ...v, start, end });
      return out;
    },
    [],
  );

  return (
    <div style={chartBox}>
      <ChartHeader title={`${yCol} breakdown`} reason={hint.reason} />
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <svg viewBox="-50 -50 100 100" style={{ width: 120, height: 120 }}>
          {slices.map((s, i) => {
            const a1 = (s.start - 90) * (Math.PI / 180);
            const a2 = (s.end - 90) * (Math.PI / 180);
            const large = s.end - s.start > 180 ? 1 : 0;
            const x1 = 40 * Math.cos(a1);
            const y1 = 40 * Math.sin(a1);
            const x2 = 40 * Math.cos(a2);
            const y2 = 40 * Math.sin(a2);
            return (
              <path
                key={i}
                d={`M0,0 L${x1},${y1} A40,40 0 ${large} 1 ${x2},${y2} Z`}
                fill={s.color}
                opacity={0.85}
              />
            );
          })}
        </svg>
        <div style={{ flex: 1, fontSize: 10 }}>
          {slices.slice(0, 6).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, background: s.color, borderRadius: 2 }} />
              <span style={{ color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ color: "#0F172A", fontFamily: "inherit" }}>{((s.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const chartBox: React.CSSProperties = {
  background: "#060A12",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 12,
  marginTop: 8,
};

function ChartHeader({ title, reason }: { title: string; reason: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "#0A0A0A" }}>{title}</span>
      <span style={{ fontSize: 9, color: "#94A3B8" }}>auto · {reason}</span>
    </div>
  );
}

// formatN moved to @/lib/charts/format (Track NNNNN)
