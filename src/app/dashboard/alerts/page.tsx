"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useI18n } from "@/lib/i18n/context";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { postJson, patchJson } from "@/lib/http/clientFetch";
import { localizedAlertDescription, type AnomalyMessageParams } from "@/lib/anomaly/messages";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF3B30",
  high: "#F59E0B",
  medium: "#F59E0B",
  low: "#0A0A0A",
};

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
type StatusFilter = "all" | "open" | "acked";

interface Alert {
  id: string;
  type?: string;
  severity: string;
  title: string;
  description: string | null;
  module: string | null;
  status: string;
  evidence?: unknown;
  falsePositiveAt?: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const { t, locale } = useI18n();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Track JJJJ — bulk select state. Map yerine Set: O(1) lookup.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Track NN — detay expand-in-place (mobile parity). Aynı anda 1 alert
  // detayı açık; tekrar tıklayınca kapanır.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<string, unknown>>({});

  /** Track OO — alerts CSV export (activity/consents/chat ile aynı pattern). */
  const exportCsv = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map((a) => ({
      time: a.createdAt,
      severity: a.severity,
      title: a.title,
      description: a.description ?? "",
      module: a.module ?? "",
      status: a.status,
      falsePositiveAt: a.falsePositiveAt ?? "",
    }));
    const csv = rowsToCsv(rows, ["time", "severity", "title", "description", "module", "status", "falsePositiveAt"]);
    downloadCsv(exportFilename("alerts", "csv"), csv);
  };

  const toggleExpand = async (alert: Alert) => {
    if (expandedId === alert.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(alert.id);
    // Lazy-load full alert (evidence) — list endpoint sadece kısa fields döner.
    if (!(alert.id in evidenceCache)) {
      try {
        const res = await fetch(`/api/alerts/${encodeURIComponent(alert.id)}`);
        if (res.ok) {
          const data = await res.json();
          setEvidenceCache((prev) => ({ ...prev, [alert.id]: data.evidence ?? null }));
        }
      } catch {
        // Sessiz fail — kullanıcı kapatıp tekrar açabilir.
      }
    }
  };

  const load = () => {
    setLoading(true);
    setError(false);
    fetch("/api/alerts")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setAlerts(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  // Mount-only fetch; load() triggers async setState which is the intended pattern here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  const filtered = alerts.filter((a) =>
    (severityFilter === "all" || a.severity === severityFilter) &&
    (statusFilter === "all" || a.status === statusFilter)
  );

  const acknowledge = async (id: string) => {
    // Server `acked`/`resolved` kabul ediyor — daha önce `acknowledged`
    // gönderiyorduk, PATCH 400 dönüyordu. Fixed Track LLL.
    await patchJson("/api/alerts", { id, status: "acked" });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acked" } : a));
  };

  /** Track JJJJ — bulk state transition. */
  const bulkUpdate = async (status: "acked" | "resolved") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await postJson("/api/alerts/bulk", { ids, status });
      if (!res.ok) {
        setBulkBusy(false);
        return;
      }
      const data = (await res.json()) as { count: number };
      // Update local state: hangi id'ler güncellendiyse onların status'unu değiştir.
      setAlerts((prev) =>
        prev.map((a) => (selected.has(a.id) ? { ...a, status } : a)),
      );
      setSelected(new Set());
      // Optional toast — varsa kullan
      if (typeof window !== "undefined" && data.count > 0) {
        // simple inline ack feedback için window event, varolan toaster yok bu sayfada
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = (visibleIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = visibleIds.every((id) => next.has(id));
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  /** Yanlış alarm toggle — Track MMM. Engine learning loop sinyali. */
  const toggleFalsePositive = async (id: string, currentlyMarked: boolean) => {
    const action = currentlyMarked ? "clear" : "falsePositive";
    const res = await postJson(
      `/api/alerts/${encodeURIComponent(id)}/feedback`,
      { action },
    );
    if (!res.ok) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, falsePositiveAt: currentlyMarked ? null : new Date().toISOString() } : a,
      ),
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "inherit", color: "#0F172A", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.alerts.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>{t.alerts.title}</h1>

      {loading && <SkeletonList count={3} height={72} gap={10} />}

      {!loading && error && <ErrorState onRetry={load} />}

      {!loading && !error && alerts.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <FilterPill label={t.alerts.filterAll} active={severityFilter === "all"} onClick={() => setSeverityFilter("all")} />
            <FilterPill label={t.alerts.sevCritical} active={severityFilter === "critical"} onClick={() => setSeverityFilter("critical")} />
            <FilterPill label={t.alerts.sevHigh} active={severityFilter === "high"} onClick={() => setSeverityFilter("high")} />
            <FilterPill label={t.alerts.sevMedium} active={severityFilter === "medium"} onClick={() => setSeverityFilter("medium")} />
            <FilterPill label={t.alerts.sevLow} active={severityFilter === "low"} onClick={() => setSeverityFilter("low")} />
            <span style={{ width: 1, background: "rgba(10,10,10,0.08)", margin: "0 4px" }} />
            <FilterPill label={t.alerts.statusAll} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <FilterPill label={t.alerts.statusOpen} active={statusFilter === "open"} onClick={() => setStatusFilter("open")} />
            <FilterPill label={t.alerts.statusAcked} active={statusFilter === "acked"} onClick={() => setStatusFilter("acked")} />
          </div>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              border: "1px solid rgba(10,10,10,0.12)",
              background: "transparent",
              color: "#525252",
              fontSize: 12,
              fontWeight: 500,
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: filtered.length === 0 ? 0.4 : 1,
            }}
          >
            ↓ {t.audit.exportCsv}
          </button>
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title={t.alerts.emptyTitle}
          description={t.alerts.emptyDesc}
        />
      )}

      {!loading && filtered.length === 0 && alerts.length > 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title={t.alerts.filteredEmptyTitle}
          description={t.alerts.filteredEmptyDesc}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "8px 14px", background: selected.size > 0 ? "#0A0A0A" : "transparent", border: selected.size > 0 ? "none" : "1px dashed rgba(10,10,10,0.12)", borderRadius: 8, color: selected.size > 0 ? "#FAFAF8" : "#475569", fontSize: 12, transition: "background 0.15s" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((a) => selected.has(a.id))}
              onChange={() => selectAllVisible(filtered.map((a) => a.id))}
              aria-label={t.alerts.bulkClear}
            />
            <span>{selected.size > 0 ? t.alerts.bulkPromptSelected(selected.size) : t.alerts.bulkPromptIdle}</span>
          </label>
          {selected.size > 0 && (
            <>
              <button
                onClick={() => bulkUpdate("acked")}
                disabled={bulkBusy}
                style={{ marginLeft: "auto", background: "#FAFAF8", border: "1px solid #FAFAF8", borderRadius: 6, padding: "4px 12px", color: "#0A0A0A", fontSize: 11, cursor: bulkBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: bulkBusy ? 0.5 : 1 }}
              >
                {t.alerts.bulkMarkAcked}
              </button>
              <button
                onClick={() => bulkUpdate("resolved")}
                disabled={bulkBusy}
                style={{ background: "transparent", border: "1px solid #FAFAF8", borderRadius: 6, padding: "4px 12px", color: "#FAFAF8", fontSize: 11, cursor: bulkBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: bulkBusy ? 0.5 : 1 }}
              >
                {t.alerts.bulkResolve}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={bulkBusy}
                style={{ background: "transparent", border: "none", color: "#FAFAF8", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
              >
                {t.alerts.bulkClear}
              </button>
            </>
          )}
        </div>
      )}

      {filtered.map((alert) => (
        <div key={alert.id} className="elevated" style={{
          background: "#FFFFFF",
          border: `1px solid ${SEVERITY_COLOR[alert.severity] ?? "#E5E7EB"}30`,
          borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] ?? "#E5E7EB"}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 12,
        }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <input
            type="checkbox"
            checked={selected.has(alert.id)}
            onChange={() => toggleSelected(alert.id)}
            aria-label={`${alert.title} ${t.alerts.rowSelectAriaSuffix}`}
            style={{ marginRight: 14, cursor: "pointer", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: SEVERITY_COLOR[alert.severity], background: `${SEVERITY_COLOR[alert.severity]}20`, padding: "2px 6px", borderRadius: 3, letterSpacing: 1 }}>
                {alert.severity.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: "#94A3B8" }}>{alert.module ?? "general"}</span>
              {alert.falsePositiveAt && (
                <span style={{ fontSize: 9, color: "#92400E", background: "#FEF3C7", border: "1px solid #F59E0B", padding: "2px 6px", borderRadius: 3, letterSpacing: 1 }}>
                  {t.alerts.falsePositiveBadge}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{alert.title}</div>
            {(() => {
              // Feature 3.1 — prefer evidence.messageKey + params (locale-aware);
              // fall back to legacy stored TR description for old alerts.
              const ev = alert.evidence as { messageKey?: string; messageParams?: AnomalyMessageParams } | null | undefined;
              const text = localizedAlertDescription(ev, alert.description, locale);
              return text ? <div style={{ fontSize: 11, color: "#475569" }}>{text}</div> : null;
            })()}
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>{new Date(alert.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}</div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
            {alert.status === "open" && (
              <button
                onClick={() => acknowledge(alert.id)}
                style={{ background: "#E5E7EB", border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 12px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
              >
                {t.alerts.ackBtn}
              </button>
            )}
            {(alert.status === "acked" || alert.status === "resolved") && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>
                {alert.status === "resolved" ? t.alerts.statusResolvedLabel : t.alerts.statusAckedLabel}
              </span>
            )}
            <button
              onClick={() => toggleFalsePositive(alert.id, !!alert.falsePositiveAt)}
              title={alert.falsePositiveAt ? t.alerts.fpClearTooltip : t.alerts.fpMarkTooltip}
              style={{
                background: alert.falsePositiveAt ? "#FEF3C7" : "transparent",
                border: `1px dashed ${alert.falsePositiveAt ? "#F59E0B" : "#94A3B8"}`,
                borderRadius: 6,
                padding: "4px 10px",
                color: alert.falsePositiveAt ? "#92400E" : "#94A3B8",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {alert.falsePositiveAt ? t.alerts.fpClearBtn : t.alerts.fpMarkBtn}
            </button>
            <button
              onClick={() => toggleExpand(alert)}
              style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
            >
              {expandedId === alert.id ? t.alerts.detailHide : t.alerts.detailShow}
            </button>
          </div>
        </div>
        {expandedId === alert.id && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #E5E7EB" }}>
            {alert.type && (
              <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 8 }}>
                <strong>{t.alerts.metaType}:</strong> <code style={{ color: "#0F172A", fontFamily: "ui-monospace, monospace" }}>{alert.type}</code>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: 600 }}>
              {t.alerts.sectionEvidence}
            </div>
            {evidenceCache[alert.id] === undefined ? (
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.common.loading}</div>
            ) : evidenceCache[alert.id] === null ? (
              <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>—</div>
            ) : (
              <pre style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, fontSize: 11, color: "#0F172A", overflow: "auto", margin: 0, fontFamily: "ui-monospace, monospace" }}>
                {JSON.stringify(evidenceCache[alert.id], null, 2)}
              </pre>
            )}
          </div>
        )}
        </div>
      ))}

      {/* Test butonu */}
      <div style={{ marginTop: 32, borderTop: "1px solid #E5E7EB", paddingTop: 24 }}>
        <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}>{t.alerts.testSectionLabel}</div>
        <button
          onClick={async () => {
            await postJson("/api/alerts", {
              type: "anomaly",
              severity: "high",
              title: t.alerts.testTitle,
              description: t.alerts.testDescription,
              module: "inventory",
            });
            const updated = await fetch("/api/alerts").then((r) => r.json());
            setAlerts(updated);
          }}
          style={{ background: "#F59E0B18", border: "1px solid #F59E0B40", borderRadius: 6, padding: "10px 20px", color: "#F59E0B", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          {t.alerts.testSendBtn}
        </button>
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 100,
        border: `1px solid ${active ? "#0A0A0A" : "rgba(10,10,10,0.12)"}`,
        background: active ? "#0A0A0A" : "transparent",
        color: active ? "#FAFAF8" : "#525252",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
