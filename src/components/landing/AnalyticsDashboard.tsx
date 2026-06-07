"use client";
// Sprint G.5 — analytics dashboard demo island.
//
// Shows what the product produces from ERP (e.g. Nebim) data: pick a time
// range + analysis type, see a bar chart and the AI-generated read-only
// SQL that produced it. Like AiDemoPreview, data is canned (no live ERP,
// no API cost) — this is a landing showcase, not the authenticated app.
//
// Charting: a dependency-free inline SVG bar chart. The repo already
// favors hand-rolled SVG charts (components/MiniChart, watchlists page)
// and we just shipped a bundle-size budget — pulling Recharts (~300KB+)
// for two demo bars would be the wrong trade. Pure SVG keeps it crisp,
// themable via CSS vars, and free.
//
// Styling: landing design tokens + inline styles (no Tailwind utilities
// compiled in this repo).

import { useState } from "react";
import type { Locale } from "@/lib/landing/locale";
import { track } from "@/lib/analytics/track";

type RangeKey = "7d" | "30d" | "90d";
type AnalysisKey = "top_products" | "rep_performance";

interface Bar {
  label: string;
  value: number;
  display: string;
}

interface Dataset {
  sql: string;
  unit: string;
  bars: Bar[];
}

interface DashCopy {
  label: string;
  title: string;
  desc: string;
  rangeLabel: string;
  analysisLabel: string;
  sqlLabel: string;
  ranges: { value: RangeKey; label: string }[];
  analyses: { value: AnalysisKey; label: string }[];
  // data[analysis][range]
  data: Record<AnalysisKey, Record<RangeKey, Dataset>>;
}

// Shared bar shapes per analysis; the range only scales the SQL window +
// the displayed totals, which is enough to feel responsive in a demo.
function buildCopy(
  label: string,
  title: string,
  desc: string,
  rangeLabel: string,
  analysisLabel: string,
  sqlLabel: string,
  ranges: { value: RangeKey; label: string }[],
  analyses: { value: AnalysisKey; label: string }[],
  topProductBars: Record<RangeKey, Bar[]>,
  repBars: Record<RangeKey, Bar[]>,
  unitCurrency: string,
  unitSales: string,
): DashCopy {
  const sqlProducts = (interval: string) =>
    `SELECT p.name, SUM(oi.qty) AS units, SUM(oi.qty * oi.price) AS revenue\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nJOIN orders o   ON o.id = oi.order_id\nWHERE o.created_at >= now() - interval '${interval}'\nGROUP BY p.name\nORDER BY revenue DESC\nLIMIT 5;`;
  const sqlReps = (interval: string) =>
    `SELECT u.name, COUNT(*) AS deals, SUM(o.total) AS revenue\nFROM orders o\nJOIN users u ON u.id = o.sales_rep_id\nWHERE o.created_at >= now() - interval '${interval}'\nGROUP BY u.name\nORDER BY revenue DESC\nLIMIT 5;`;
  const intervals: Record<RangeKey, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
  const mk = (sqlFn: (i: string) => string, bars: Record<RangeKey, Bar[]>, unit: string) =>
    Object.fromEntries(
      (Object.keys(intervals) as RangeKey[]).map((r) => [r, { sql: sqlFn(intervals[r]), unit, bars: bars[r] }]),
    ) as Record<RangeKey, Dataset>;
  return {
    label,
    title,
    desc,
    rangeLabel,
    analysisLabel,
    sqlLabel,
    ranges,
    analyses,
    data: {
      top_products: mk(sqlProducts, topProductBars, unitCurrency),
      rep_performance: mk(sqlReps, repBars, unitSales),
    },
  };
}

const PRODUCT_BARS: Record<RangeKey, Bar[]> = {
  "7d": [
    { label: "Kaşmir Kazak", value: 92, display: "₺92K" },
    { label: "Deri Ceket", value: 78, display: "₺78K" },
    { label: "Trençkot", value: 64, display: "₺64K" },
    { label: "İpek Gömlek", value: 51, display: "₺51K" },
    { label: "Yün Pantolon", value: 39, display: "₺39K" },
  ],
  "30d": [
    { label: "Deri Ceket", value: 340, display: "₺340K" },
    { label: "Kaşmir Kazak", value: 295, display: "₺295K" },
    { label: "Trençkot", value: 248, display: "₺248K" },
    { label: "İpek Gömlek", value: 190, display: "₺190K" },
    { label: "Yün Pantolon", value: 155, display: "₺155K" },
  ],
  "90d": [
    { label: "Deri Ceket", value: 980, display: "₺980K" },
    { label: "Kaşmir Kazak", value: 870, display: "₺870K" },
    { label: "Trençkot", value: 720, display: "₺720K" },
    { label: "Yün Pantolon", value: 540, display: "₺540K" },
    { label: "İpek Gömlek", value: 505, display: "₺505K" },
  ],
};

const REP_BARS: Record<RangeKey, Bar[]> = {
  "7d": [
    { label: "Elif K.", value: 31, display: "31" },
    { label: "Mert A.", value: 27, display: "27" },
    { label: "Zeynep T.", value: 22, display: "22" },
    { label: "Can Y.", value: 18, display: "18" },
    { label: "Deniz S.", value: 14, display: "14" },
  ],
  "30d": [
    { label: "Mert A.", value: 118, display: "118" },
    { label: "Elif K.", value: 109, display: "109" },
    { label: "Zeynep T.", value: 94, display: "94" },
    { label: "Deniz S.", value: 71, display: "71" },
    { label: "Can Y.", value: 66, display: "66" },
  ],
  "90d": [
    { label: "Elif K.", value: 342, display: "342" },
    { label: "Mert A.", value: 318, display: "318" },
    { label: "Zeynep T.", value: 276, display: "276" },
    { label: "Can Y.", value: 201, display: "201" },
    { label: "Deniz S.", value: 188, display: "188" },
  ],
};

const COPY: Record<Locale, DashCopy> = {
  en: buildCopy(
    "Analytics",
    "From raw ERP rows to answers",
    "Choose a window and an analysis. ERPAIO writes the read-only SQL and renders the result.",
    "Time range",
    "Analysis",
    "AI-generated SQL",
    [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
    [
      { value: "top_products", label: "Top-selling products" },
      { value: "rep_performance", label: "Sales rep performance" },
    ],
    PRODUCT_BARS,
    REP_BARS,
    "revenue",
    "deals",
  ),
  tr: buildCopy(
    "Analitik",
    "Ham ERP satırlarından cevaplara",
    "Bir zaman aralığı ve analiz seçin. ERPAIO salt-okunur SQL'i yazar ve sonucu çizer.",
    "Zaman aralığı",
    "Analiz türü",
    "AI-üretimi SQL",
    [
      { value: "7d", label: "Son 7 gün" },
      { value: "30d", label: "Son 30 gün" },
      { value: "90d", label: "Son 90 gün" },
    ],
    [
      { value: "top_products", label: "En çok satan ürünler" },
      { value: "rep_performance", label: "Satış danışmanı performansı" },
    ],
    PRODUCT_BARS,
    REP_BARS,
    "ciro",
    "satış",
  ),
  ar: buildCopy(
    "التحليلات",
    "من صفوف ERP الخام إلى الإجابات",
    "اختر نطاقًا زمنيًا ونوع تحليل. يكتب ERPAIO استعلام SQL للقراءة فقط ويعرض النتيجة.",
    "النطاق الزمني",
    "نوع التحليل",
    "SQL مُولّد بالذكاء الاصطناعي",
    [
      { value: "7d", label: "آخر 7 أيام" },
      { value: "30d", label: "آخر 30 يومًا" },
      { value: "90d", label: "آخر 90 يومًا" },
    ],
    [
      { value: "top_products", label: "المنتجات الأكثر مبيعًا" },
      { value: "rep_performance", label: "أداء مندوبي المبيعات" },
    ],
    PRODUCT_BARS,
    REP_BARS,
    "الإيراد",
    "الصفقات",
  ),
};

function BarChart({ bars, rtl }: { bars: Bar[]; rtl: boolean }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const rowH = 40;
  const labelW = 120;
  const barAreaW = 360;
  const width = labelW + barAreaW + 70;
  const height = bars.length * rowH + 10;
  return (
    <svg
      role="img"
      aria-label="Bar chart"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", direction: "ltr" }}
    >
      {bars.map((b, i) => {
        const y = i * rowH + 8;
        const w = Math.max(2, (b.value / max) * barAreaW);
        const x = rtl ? width - labelW - w : labelW;
        const labelX = rtl ? width - 4 : 0;
        const valX = rtl ? x - 8 : x + w + 8;
        return (
          <g key={b.label}>
            <text
              x={labelX}
              y={y + rowH / 2}
              dominantBaseline="middle"
              textAnchor={rtl ? "end" : "start"}
              style={{ fontSize: 13, fill: "var(--text)", fontFamily: "inherit" }}
            >
              {b.label}
            </text>
            <rect x={x} y={y} width={w} height={rowH - 16} rx={5} style={{ fill: "var(--bg-dark)" }} />
            <text
              x={valX}
              y={y + (rowH - 16) / 2}
              dominantBaseline="middle"
              textAnchor={rtl ? "end" : "start"}
              style={{
                fontSize: 12,
                fill: "var(--text-secondary)",
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              {b.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AnalyticsDashboard({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  const rtl = locale === "ar";
  const [range, setRange] = useState<RangeKey>("30d");
  const [analysis, setAnalysis] = useState<AnalysisKey>("top_products");
  const dataset = t.data[analysis][range];

  function onChange(next: { range?: RangeKey; analysis?: AnalysisKey }) {
    const r = next.range ?? range;
    const a = next.analysis ?? analysis;
    if (next.range) setRange(next.range);
    if (next.analysis) setAnalysis(next.analysis);
    track("ai_demo_run", { source: "analytics", analysis: a, range: r, locale });
  }

  const selectStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 13,
    fontFamily: "inherit",
    color: "var(--text)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    cursor: "pointer",
  };
  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    fontFamily: "'JetBrains Mono',monospace",
    marginBottom: 6,
  };

  return (
    <section id="analytics-dashboard" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">{t.label}</div>
        <div className="section-title">{t.title}</div>
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>

        <div
          className="elevated"
          style={{
            marginTop: 40,
            textAlign: "start",
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            direction: rtl ? "rtl" : "ltr",
          }}
        >
          {/* Controls */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <label htmlFor="ad-range" style={fieldLabel}>
                {t.rangeLabel}
              </label>
              <select
                id="ad-range"
                value={range}
                onChange={(e) => onChange({ range: e.target.value as RangeKey })}
                style={selectStyle}
              >
                {t.ranges.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ad-analysis" style={fieldLabel}>
                {t.analysisLabel}
              </label>
              <select
                id="ad-analysis"
                value={analysis}
                onChange={(e) => onChange({ analysis: e.target.value as AnalysisKey })}
                style={selectStyle}
              >
                {t.analyses.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart */}
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <BarChart bars={dataset.bars} rtl={rtl} />
          </div>

          {/* Live SQL */}
          <div>
            <div style={fieldLabel}>{t.sqlLabel}</div>
            <pre
              style={{
                margin: 0,
                padding: 16,
                background: "var(--bg-dark)",
                color: "#E6E6E6",
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.55,
                fontFamily: "'JetBrains Mono',monospace",
                overflowX: "auto",
                direction: "ltr",
                textAlign: "left",
              }}
            >
              <code>{dataset.sql}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
