"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthCheck {
  ok: boolean;
  version: string;
  env: string;
  checks: { database: { ok: boolean; latencyMs: number; error?: string } };
  timestamp: string;
  uptimeMs: number;
}

interface ServiceStatus {
  name: string;
  description: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  message?: string;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: HealthCheck) => {
        setHealth(d);
        setLoading(false);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Bilinmeyen hata");
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  const services: ServiceStatus[] = [
    {
      name: "Web & API",
      description: "Vercel — chat, alerts, dashboard endpoints",
      status: error ? "outage" : health ? "operational" : "unknown",
      message: error ?? undefined,
    },
    {
      name: "Veritabanı",
      description: "Supabase Postgres — tenants, queries, audit",
      status: !health ? "unknown" : health.checks.database.ok
        ? (health.checks.database.latencyMs > 1500 ? "degraded" : "operational")
        : "outage",
      message: health?.checks.database.error,
    },
    {
      name: "AI (Anthropic)",
      description: "Claude Sonnet 4 — SQL generation",
      status: "operational",
      message: "status.anthropic.com için harici monitoring",
    },
    {
      name: "Bildirimler",
      description: "Twilio (WhatsApp) + Resend (email) + Expo (push)",
      status: "operational",
    },
    {
      name: "Cron Jobs",
      description: "Anomaly detection — saatlik (GH Actions) + günlük (Vercel)",
      status: "operational",
    },
  ];

  const overall = services.some((s) => s.status === "outage")
    ? "outage"
    : services.some((s) => s.status === "degraded")
    ? "degraded"
    : services.every((s) => s.status === "operational")
    ? "operational"
    : "unknown";

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid #131A26", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#00E5FF", fontSize: 11, letterSpacing: 4, fontWeight: 700, textDecoration: "none" }}>ERPAIO</Link>
        <div style={{ fontSize: 11, color: "#9AA5B4" }}>Status</div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{
          background: bgFor(overall),
          borderColor: colorFor(overall),
          borderWidth: 1,
          borderStyle: "solid",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}>
          <div style={{ color: colorFor(overall), fontSize: 11, letterSpacing: 3, marginBottom: 6 }}>
            {labelFor(overall)}
          </div>
          <div style={{ fontSize: 18, color: "#E8EDF5" }}>{summaryFor(overall)}</div>
          {health && (
            <div style={{ fontSize: 10, color: "#3A4558", marginTop: 8 }}>
              v{health.version} · son güncelleme {new Date(health.timestamp).toLocaleString("tr-TR")}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 14, color: "#00E5FF", marginBottom: 16 }}>Servisler</h2>
        {loading ? (
          <div style={{ color: "#3A4558" }}>Yükleniyor...</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {services.map((s) => (
              <div key={s.name} style={{
                background: "#0C1018",
                border: "1px solid #131A26",
                borderLeft: `3px solid ${colorFor(s.status)}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13, color: "#E8EDF5" }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "#9AA5B4" }}>{s.description}</div>
                  {s.message && <div style={{ fontSize: 10, color: "#FF9500", marginTop: 4 }}>⚠ {s.message}</div>}
                </div>
                <div style={{ color: colorFor(s.status), fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>
                  {labelFor(s.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {health && (
          <div style={{ marginTop: 32, padding: 16, background: "#0C1018", border: "1px solid #131A26", borderRadius: 8, fontSize: 11, color: "#9AA5B4" }}>
            <div style={{ marginBottom: 4 }}>DB latency: <strong style={{ color: "#E8EDF5" }}>{health.checks.database.latencyMs}ms</strong></div>
            <div>Environment: <strong style={{ color: "#E8EDF5" }}>{health.env}</strong></div>
          </div>
        )}

        <p style={{ fontSize: 10, color: "#3A4558", marginTop: 24, textAlign: "center" }}>
          Otomatik 30 saniyede bir yenilenir. Sorunlar için: <a href="mailto:support@erpaio.com" style={{ color: "#00E5FF" }}>support@erpaio.com</a>
        </p>
      </main>
    </div>
  );
}

function colorFor(s: string): string {
  return s === "operational" ? "#69FF47" : s === "degraded" ? "#FFD740" : s === "outage" ? "#FF3B30" : "#3A4558";
}

function bgFor(s: string): string {
  return s === "operational" ? "rgba(105,255,71,0.1)" : s === "degraded" ? "rgba(255,215,64,0.1)" : s === "outage" ? "rgba(255,59,48,0.1)" : "#0C1018";
}

function labelFor(s: string): string {
  return s === "operational" ? "ÇALIŞIYOR" : s === "degraded" ? "YAVAŞ" : s === "outage" ? "KESİNTİDE" : "BİLİNMİYOR";
}

function summaryFor(s: string): string {
  return s === "operational" ? "Tüm sistemler normal." : s === "degraded" ? "Bazı servisler yavaş." : s === "outage" ? "Bir veya daha fazla servis kesintide." : "Servis durumu kontrol ediliyor...";
}
