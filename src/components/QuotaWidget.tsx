"use client";
// Sprint P3 — dashboard token quota widget (dashboard is TR-only).
//
// Gives the user transparent visibility of their monthly token quota on
// the overview page: a progress bar (used/budget), remaining tokens, and
// days until reset, colored by the shared soft-limit tiers. Self-contained
// (fetches /api/tenant/usage itself) so placement is a one-line change.
// Reuses computeBudgetStatus's API shape + budgetStatusLevel/formatTokens/
// daysUntilReset — no new budget logic.

import { useEffect, useState } from "react";
import { budgetStatusLevel, formatTokens, daysUntilReset } from "@/lib/budget/format";

interface Usage {
  used: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  resetsOn: string;
}

const LEVEL_COLOR = {
  ok: "#10B981",
  warning: "#F59E0B",
  danger: "#DC2626",
} as const;

export function QuotaWidget() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/tenant/usage");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUsage(d);
      } catch {
        // Best-effort widget — never block the overview.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="skeleton" style={{ height: 96, borderRadius: 12, marginBottom: 24 }} />;
  }
  if (!usage) return null;

  const level = budgetStatusLevel(usage.percentUsed);
  const color = LEVEL_COLOR[level];
  const days = daysUntilReset(usage.resetsOn);
  const pct = Math.round(usage.percentUsed);

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#0A0A0A", fontFamily: "'JetBrains Mono', monospace" }}>
          Token Kotası
        </span>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>
          {days} gün sonra sıfırlanır
        </span>
      </div>

      <div style={{ height: 8, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, usage.percentUsed)}%`,
            background: color,
            transition: "width .3s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#475569", flexWrap: "wrap", gap: 8 }}>
        <span>
          <strong style={{ color: "#0F172A" }}>{formatTokens(usage.used)}</strong> / {formatTokens(usage.budget)} kullanıldı (%{pct})
        </span>
        <span style={{ color }}>
          <strong>{formatTokens(usage.remaining)}</strong> kaldı
        </span>
      </div>

      {level === "warning" && (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: LEVEL_COLOR.warning }}>
          Kotanızın çoğunu kullandınız — ay sonuna dikkat edin.
        </p>
      )}
      {level === "danger" && (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: LEVEL_COLOR.danger }}>
          ⚠ Kota neredeyse doldu. Kesintisiz kullanım için planınızı yükseltmeyi düşünün.
        </p>
      )}
    </div>
  );
}
