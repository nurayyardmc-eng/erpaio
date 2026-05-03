"use client";
import { useState, useEffect } from "react";
import { Skeleton, SkeletonList } from "@/components/Skeleton";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF3B30",
  high: "#F59E0B",
  medium: "#F59E0B",
  low: "#0A0A0A",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => { setAlerts(data); setLoading(false); });
  }, []);

  const acknowledge = async (id: string) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "acknowledged" }),
    });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" } : a));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "inherit", color: "#0F172A", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Bildirimler</h1>

      {loading && <SkeletonList count={3} height={72} gap={10} />}

      {!loading && alerts.length === 0 && (
        <div style={{ color: "#94A3B8", fontSize: 13 }}>Aktif bildirim yok.</div>
      )}

      {alerts.map((alert) => (
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
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: SEVERITY_COLOR[alert.severity], background: `${SEVERITY_COLOR[alert.severity]}20`, padding: "2px 6px", borderRadius: 3, letterSpacing: 1 }}>
                {alert.severity.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: "#94A3B8" }}>{alert.module ?? "general"}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{alert.title}</div>
            {alert.description && <div style={{ fontSize: 11, color: "#475569" }}>{alert.description}</div>}
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>{new Date(alert.createdAt).toLocaleString("tr-TR")}</div>
          </div>

          {alert.status === "open" && (
            <button
              onClick={() => acknowledge(alert.id)}
              style={{ background: "#E5E7EB", border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 12px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              Okundu
            </button>
          )}
          {alert.status === "acknowledged" && (
            <span style={{ fontSize: 10, color: "#94A3B8" }}>Okundu</span>
          )}
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