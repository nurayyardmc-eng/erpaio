"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

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
  severity: string;
  title: string;
  description: string | null;
  module: string | null;
  status: string;
  falsePositiveAt?: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Track JJJJ — bulk select state. Map yerine Set: O(1) lookup.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "acked" }),
    });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acked" } : a));
  };

  /** Track JJJJ — bulk state transition. */
  const bulkUpdate = async (status: "acked" | "resolved") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/alerts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
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
    const res = await fetch(`/api/alerts/${encodeURIComponent(id)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, falsePositiveAt: currentlyMarked ? null : new Date().toISOString() } : a,
      ),
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "inherit", color: "#0F172A", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Bildirimler</h1>

      {loading && <SkeletonList count={3} height={72} gap={10} />}

      {!loading && error && <ErrorState onRetry={load} />}

      {!loading && !error && alerts.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <FilterPill label="Tümü" active={severityFilter === "all"} onClick={() => setSeverityFilter("all")} />
          <FilterPill label="Kritik" active={severityFilter === "critical"} onClick={() => setSeverityFilter("critical")} />
          <FilterPill label="Yüksek" active={severityFilter === "high"} onClick={() => setSeverityFilter("high")} />
          <FilterPill label="Orta" active={severityFilter === "medium"} onClick={() => setSeverityFilter("medium")} />
          <FilterPill label="Düşük" active={severityFilter === "low"} onClick={() => setSeverityFilter("low")} />
          <span style={{ width: 1, background: "rgba(10,10,10,0.08)", margin: "0 4px" }} />
          <FilterPill label="Hepsi" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <FilterPill label="Açık" active={statusFilter === "open"} onClick={() => setStatusFilter("open")} />
          <FilterPill label="Okunmuş" active={statusFilter === "acked"} onClick={() => setStatusFilter("acked")} />
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title="Henüz bildirim yok"
          description="Anomaly detector saatlik çalışıyor. Önemli olaylar burada gözükür."
        />
      )}

      {!loading && filtered.length === 0 && alerts.length > 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title="Filtreye uyan bildirim yok"
          description="Filtreyi değiştirerek tekrar deneyin."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "8px 14px", background: selected.size > 0 ? "#0A0A0A" : "transparent", border: selected.size > 0 ? "none" : "1px dashed rgba(10,10,10,0.12)", borderRadius: 8, color: selected.size > 0 ? "#FAFAF8" : "#475569", fontSize: 12, transition: "background 0.15s" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((a) => selected.has(a.id))}
              onChange={() => selectAllVisible(filtered.map((a) => a.id))}
              aria-label="Tümünü seç"
            />
            <span>{selected.size > 0 ? `${selected.size} bildirim seçili` : "Toplu işlem için seç"}</span>
          </label>
          {selected.size > 0 && (
            <>
              <button
                onClick={() => bulkUpdate("acked")}
                disabled={bulkBusy}
                style={{ marginLeft: "auto", background: "#FAFAF8", border: "1px solid #FAFAF8", borderRadius: 6, padding: "4px 12px", color: "#0A0A0A", fontSize: 11, cursor: bulkBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: bulkBusy ? 0.5 : 1 }}
              >
                Okundu işaretle
              </button>
              <button
                onClick={() => bulkUpdate("resolved")}
                disabled={bulkBusy}
                style={{ background: "transparent", border: "1px solid #FAFAF8", borderRadius: 6, padding: "4px 12px", color: "#FAFAF8", fontSize: 11, cursor: bulkBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: bulkBusy ? 0.5 : 1 }}
              >
                Çöz
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={bulkBusy}
                style={{ background: "transparent", border: "none", color: "#FAFAF8", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
              >
                Temizle
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <input
            type="checkbox"
            checked={selected.has(alert.id)}
            onChange={() => toggleSelected(alert.id)}
            aria-label={`${alert.title} seç`}
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
                  YANLIŞ ALARM
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{alert.title}</div>
            {alert.description && <div style={{ fontSize: 11, color: "#475569" }}>{alert.description}</div>}
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>{new Date(alert.createdAt).toLocaleString("tr-TR")}</div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
            {alert.status === "open" && (
              <button
                onClick={() => acknowledge(alert.id)}
                style={{ background: "#E5E7EB", border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 12px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
              >
                Okundu
              </button>
            )}
            {(alert.status === "acked" || alert.status === "resolved") && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>
                {alert.status === "resolved" ? "Çözüldü" : "Okundu"}
              </span>
            )}
            <button
              onClick={() => toggleFalsePositive(alert.id, !!alert.falsePositiveAt)}
              title={alert.falsePositiveAt ? "Yanlış alarm işaretini kaldır" : "Yanlış alarm olarak işaretle (engine öğrensin)"}
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
              {alert.falsePositiveAt ? "↶ FP geri al" : "Yanlış alarmdı"}
            </button>
          </div>
        </div>
      ))}

      {/* Test butonu */}
      <div style={{ marginTop: 32, borderTop: "1px solid #E5E7EB", paddingTop: 24 }}>
        <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}>Test bildirimi gönder:</div>
        <button
          onClick={async () => {
            await fetch("/api/alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "anomaly",
                severity: "high",
                title: "Test: Stok kritik seviyede",
                description: "5 ürün kritik stok seviyesinin altına düştü.",
                module: "inventory",
              }),
            });
            const updated = await fetch("/api/alerts").then((r) => r.json());
            setAlerts(updated);
          }}
          style={{ background: "#F59E0B18", border: "1px solid #F59E0B40", borderRadius: 6, padding: "10px 20px", color: "#F59E0B", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          Test Bildirimi Gönder
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