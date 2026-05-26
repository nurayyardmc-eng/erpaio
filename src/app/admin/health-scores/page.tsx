"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatPercent } from "@/lib/format/percent";
import { healthScoreGrade } from "@/lib/analytics/healthScore";

interface TenantHealth {
  tenant: {
    id: string;
    name: string;
    plan: string;
    createdAt: string;
  };
  health: {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    signals: {
      activity: number;
      qualityRate: number;
      feedbackRate: number;
      cacheHitRate: number;
      errorRate: number;
      daysActive: number;
    };
  };
}

const GRADE_COLORS: Record<TenantHealth["health"]["grade"], { fg: string; bg: string }> = {
  A: { fg: "#10B981", bg: "#D1FAE5" },
  B: { fg: "#22C55E", bg: "#DCFCE7" },
  C: { fg: "#F59E0B", bg: "#FEF3C7" },
  D: { fg: "#EA580C", bg: "#FED7AA" },
  F: { fg: "#EF4444", bg: "#FEE2E2" },
};

export default function HealthScoresPage() {
  const [items, setItems] = useState<TenantHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"score" | "activity" | "name">("score");

  useEffect(() => {
    fetch("/api/admin/health-scores")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setItems(d.tenants ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    if (sortKey === "score") return b.health.score - a.health.score;
    if (sortKey === "activity") return b.health.signals.activity - a.health.signals.activity;
    return a.tenant.name.localeCompare(b.tenant.name);
  });

  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const it of items) gradeCount[it.health.grade]++;

  const avgScore = items.length > 0
    ? Math.round(items.reduce((a, i) => a + i.health.score, 0) / items.length)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · HEALTH SCORES</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>Tenant Health Scores</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 24 }}>
        Son 30 gün — activity (25%) + qualityRate (25%) + feedbackRate (15%) +
        cacheHitRate (15%) + daysActive (20%). Düşük skor = pilot risk veya destek gerekiyor.
      </p>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
        <div style={summaryCard}>
          <div style={summaryLabel}>Ortalama</div>
          <div style={{ ...summaryValue, color: gradeColorFor(avgScore) }}>{avgScore}</div>
        </div>
        {(["A", "B", "C", "D", "F"] as const).map((g) => (
          <div key={g} style={summaryCard}>
            <div style={summaryLabel}>Grade {g}</div>
            <div style={{ ...summaryValue, color: GRADE_COLORS[g].fg }}>{gradeCount[g] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["score", "activity", "name"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              border: `1px solid ${sortKey === k ? "#0A0A0A" : "#E5E7EB"}`,
              background: sortKey === k ? "#0A0A0A" : "#FFFFFF",
              color: sortKey === k ? "#FFFFFF" : "#0F172A",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {k === "score" ? "Skora göre" : k === "activity" ? "Activity'e göre" : "İsme göre"}
          </button>
        ))}
        {items.length > 0 && (
          <button
            onClick={() => {
              /* Track UU — sysadmin health scores CSV (pilot risk audit). */
              const rows = items.map((it) => ({
                tenantId: it.tenant.id,
                name: it.tenant.name,
                plan: it.tenant.plan,
                score: it.health.score,
                grade: it.health.grade,
                activity: it.health.signals.activity,
                qualityRate: it.health.signals.qualityRate,
                feedbackRate: it.health.signals.feedbackRate,
                cacheHitRate: it.health.signals.cacheHitRate,
                errorRate: it.health.signals.errorRate,
                daysActive: it.health.signals.daysActive,
                createdAt: it.tenant.createdAt,
              }));
              const csv = rowsToCsv(rows, ["tenantId", "name", "plan", "score", "grade", "activity", "qualityRate", "feedbackRate", "cacheHitRate", "errorRate", "daysActive", "createdAt"]);
                            downloadCsv(exportFilename("health-scores", "csv"), csv);
            }}
            style={{
              marginLeft: "auto",
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              border: "1px solid rgba(10,10,10,0.12)",
              background: "transparent",
              color: "#525252",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ↓ CSV
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Tenant yok.</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ ...th, textAlign: "left" }}>Tenant</th>
                <th style={th}>Plan</th>
                <th style={th}>Skor</th>
                <th style={th}>Grade</th>
                <th style={th}>Aktivite</th>
                <th style={th}>Kalite</th>
                <th style={th}>Cache hit</th>
                <th style={th}>Aktif gün</th>
                <th style={th}>Hata oranı</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((it) => (
                <tr key={it.tenant.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={{ ...td, textAlign: "left" }}>{it.tenant.name}</td>
                  <td style={td}>
                    <span style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: "#475569" }}>
                      {it.tenant.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: gradeColorFor(it.health.score) }}>
                    {it.health.score}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: GRADE_COLORS[it.health.grade].bg,
                      color: GRADE_COLORS[it.health.grade].fg,
                      fontWeight: 700,
                      fontSize: 11,
                    }}>{it.health.grade}</span>
                  </td>
                  <td style={td}>{formatPercent(it.health.signals.activity)}</td>
                  <td style={td}>{formatPercent(it.health.signals.qualityRate)}</td>
                  <td style={td}>{formatPercent(it.health.signals.cacheHitRate)}</td>
                  <td style={td}>{it.health.signals.daysActive}</td>
                  <td style={{ ...td, color: it.health.signals.errorRate > 0.2 ? "#EF4444" : "#0F172A" }}>
                    {formatPercent(it.health.signals.errorRate)}
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

function gradeColorFor(score: number): string {
  return GRADE_COLORS[healthScoreGrade(score)].fg;
}

const summaryCard: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  padding: 16,
};

const summaryLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#475569",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const summaryValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
};

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
};
