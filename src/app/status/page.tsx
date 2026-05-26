"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTimestamp } from "@/lib/format/time";

interface CronJobHealth {
  runs: number;
  failed: number;
  lastRunAt: string | null;
}

interface HealthCheck {
  ok: boolean;
  version: string;
  env: string;
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
    cron?: { ok: boolean; jobs: Record<string, CronJobHealth> };
  };
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
    // ?deep=true: cron health'i de getir. 30s polling için ekstra DB query
    // ucuz (last 24h CronRun zaten indexed).
    fetch("/api/health?deep=true")
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
      description: "Anomaly + scheduled-reports + watchlists + trial-warnings (GitHub Actions)",
      status: cronStatusFromHealth(health),
      message: cronMessageFromHealth(health),
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
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#0A0A0A", fontSize: 11, letterSpacing: 4, fontWeight: 700, textDecoration: "none" }}>ERPAIO</Link>
        <div style={{ fontSize: 11, color: "#475569" }}>Status</div>
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
          <div style={{ fontSize: 18, color: "#0F172A" }}>{summaryFor(overall)}</div>
          {health && (
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 8 }}>
              v{health.version} · son güncelleme {formatTimestamp(health.timestamp)}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 14, color: "#0A0A0A", marginBottom: 16 }}>Servisler</h2>
        {loading ? (
          <div style={{ color: "#94A3B8" }}>Yükleniyor...</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {services.map((s) => (
              <div key={s.name} style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderLeft: `3px solid ${colorFor(s.status)}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13, color: "#0F172A" }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{s.description}</div>
                  {s.message && <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 4 }}>⚠ {s.message}</div>}
                </div>
                <div style={{ color: colorFor(s.status), fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>
                  {labelFor(s.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {health && (
          <div style={{ marginTop: 32, padding: 16, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 11, color: "#475569" }}>
            <div style={{ marginBottom: 4 }}>DB latency: <strong style={{ color: "#0F172A" }}>{health.checks.database.latencyMs}ms</strong></div>
            <div>Environment: <strong style={{ color: "#0F172A" }}>{health.env}</strong></div>
          </div>
        )}

        <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 24, textAlign: "center" }}>
          Otomatik 30 saniyede bir yenilenir. Sorunlar için: <a href="mailto:support@erpaio.com" style={{ color: "#0A0A0A" }}>support@erpaio.com</a>
        </p>
      </main>
    </div>
  );
}

function colorFor(s: string): string {
  return s === "operational" ? "#10B981" : s === "degraded" ? "#F59E0B" : s === "outage" ? "#FF3B30" : "#94A3B8";
}

function bgFor(s: string): string {
  return s === "operational" ? "rgba(105,255,71,0.1)" : s === "degraded" ? "rgba(255,215,64,0.1)" : s === "outage" ? "rgba(255,59,48,0.1)" : "#FFFFFF";
}

function labelFor(s: string): string {
  return s === "operational" ? "ÇALIŞIYOR" : s === "degraded" ? "YAVAŞ" : s === "outage" ? "KESİNTİDE" : "BİLİNMİYOR";
}

function summaryFor(s: string): string {
  return s === "operational" ? "Tüm sistemler normal." : s === "degraded" ? "Bazı servisler yavaş." : s === "outage" ? "Bir veya daha fazla servis kesintide." : "Servis durumu kontrol ediliyor...";
}

function cronStatusFromHealth(h: HealthCheck | null): ServiceStatus["status"] {
  if (!h?.checks.cron) return "unknown";
  const jobs = Object.values(h.checks.cron.jobs);
  if (jobs.length === 0) return "degraded"; // no runs last 24h
  const totalFailed = jobs.reduce((a, j) => a + j.failed, 0);
  const totalRuns = jobs.reduce((a, j) => a + j.runs, 0);
  if (totalRuns === 0) return "degraded";
  const failRate = totalFailed / totalRuns;
  if (failRate >= 0.5) return "outage";
  if (failRate > 0) return "degraded";
  return "operational";
}

function cronMessageFromHealth(h: HealthCheck | null): string | undefined {
  if (!h?.checks.cron) return undefined;
  const jobs = h.checks.cron.jobs;
  const totalRuns = Object.values(jobs).reduce((a, j) => a + j.runs, 0);
  const totalFailed = Object.values(jobs).reduce((a, j) => a + j.failed, 0);
  if (totalRuns === 0) return "Son 24 saatte çalışan cron yok";
  if (totalFailed > 0) return `Son 24h: ${totalRuns} run, ${totalFailed} başarısız`;
  return `Son 24h: ${totalRuns} başarılı run`;
}
