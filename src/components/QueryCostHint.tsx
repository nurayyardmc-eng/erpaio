"use client";
// Sprint P2 — pre-flight query cost hint (dashboard is TR-only).
//
// Renders a quiet line above the chat input giving the user "cost
// confidence" before they run a query: an estimated token cost for the
// current question and, once the tenant's budget is known, the projected
// share of the monthly quota with a soft-limit warning as it approaches
// the cap.
//
// Self-contained: fetches /api/tenant/usage once on mount so wiring it
// into the chat page is a single-line change. Reuses the existing pure
// helpers (estimateChatTokens, budgetStatusLevel, formatTokens) — no new
// budget logic here.

import { useEffect, useState } from "react";
import { estimateChatTokens } from "@/lib/budget/estimate";
import { budgetStatusLevel, formatTokens } from "@/lib/budget/format";

interface Usage {
  used: number;
  budget: number;
}

const LEVEL_COLOR = {
  ok: "#94A3B8",
  warning: "#B45309",
  danger: "#DC2626",
} as const;

export function QueryCostHint({ question }: { question: string }) {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/tenant/usage");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUsage({ used: d.used, budget: d.budget });
      } catch {
        // Best-effort — the hint is enrichment; never block the chat.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmed = question.trim();
  if (!trimmed) return null;

  const estimate = estimateChatTokens({ questionChars: trimmed.length });

  let projectedPct: number | null = null;
  if (usage && usage.budget > 0) {
    projectedPct = Math.min(100, ((usage.used + estimate) / usage.budget) * 100);
  }
  const level = projectedPct === null ? "ok" : budgetStatusLevel(projectedPct);
  const color = LEVEL_COLOR[level];

  return (
    <div
      style={{
        padding: "0 18px 6px",
        fontSize: 11,
        color,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span>≈ {formatTokens(estimate)} token</span>
      {projectedPct !== null && (
        <span style={{ opacity: 0.85 }}>
          · kotanızın ~%{Math.round(projectedPct)}&apos;i
        </span>
      )}
      {level === "warning" && <span>· kotaya yaklaşıyorsunuz</span>}
      {level === "danger" && <span>· ⚠ kota dolmak üzere — yükseltmeyi düşünün</span>}
    </div>
  );
}
