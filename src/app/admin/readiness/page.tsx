"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { colors } from "@/lib/theme";

interface ReadinessCheck {
  key: string;
  label: string;
  level: "ok" | "missing" | "fallback";
  detail: string;
  productionRequired: boolean;
}

interface ReadinessReport {
  checks: ReadinessCheck[];
  blockerCount: number;
  warningCount: number;
}

/**
 * Production setup checklist — sysadmin only.
 *
 * Track LLLLLLL — UI surface for /api/admin/readiness.
 * Shows env-var-driven capability gaps so ops can confirm
 * "deploy production-ready before launching pilot".
 */
export default function ReadinessPage() {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/readiness")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          return;
        }
        setReport(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Hata"));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, color: colors.error }}>
        <p>{error}</p>
        <Link href="/admin" style={{ color: colors.text }}>← Admin</Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: 40, color: colors.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bgSubtle,
      color: colors.text,
      padding: 40,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
          ERPAIO · ADMIN
        </div>
        <h1 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 700 }}>
          Production Readiness
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 12, marginBottom: 24, maxWidth: 600 }}>
          Hangi env değişkenleri aktif, hangileri eksik — pilot launch öncesi kontrol listesi.
        </p>

        {/* Summary */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <SummaryCard
            count={report.blockerCount}
            label="Kritik eksik"
            color={report.blockerCount > 0 ? colors.error : colors.success}
          />
          <SummaryCard
            count={report.warningCount}
            label="Uyarı (fallback)"
            color={report.warningCount > 3 ? colors.warning : colors.textMuted}
          />
          <SummaryCard
            count={report.checks.filter((c) => c.level === "ok").length}
            label="Hazır"
            color={colors.success}
          />
        </div>

        {/* Checklist */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {report.checks.map((c, i) => (
            <CheckRow key={c.key} check={c} isLast={i === report.checks.length - 1} />
          ))}
        </div>

        <p style={{
          fontSize: 11,
          color: colors.textSubtle,
          marginTop: 16,
        }}>
          Eksik env&apos;ler için <code style={{
            background: colors.bgSubtle,
            padding: "1px 6px",
            borderRadius: 4,
            fontFamily: "ui-monospace, monospace",
          }}>.env.example</code> dosyasına bakın. Vercel Settings → Environment Variables.
        </p>

        <Link href="/admin" style={{
          display: "inline-block",
          marginTop: 16,
          color: colors.text,
          fontSize: 12,
          textDecoration: "none",
        }}>
          ← Admin paneli
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: 16,
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function CheckRow({ check, isLast }: { check: ReadinessCheck; isLast: boolean }) {
  const icon = check.level === "ok"
    ? <CheckCircle2 size={18} color={colors.success} />
    : check.level === "fallback"
    ? <AlertCircle size={18} color={colors.warning} />
    : <XCircle size={18} color={colors.error} />;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 16px",
      borderBottom: isLast ? "none" : `1px solid ${colors.border}`,
    }}>
      <div style={{ paddingTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
          {check.label}
          {check.productionRequired && (
            <span style={{
              fontSize: 9,
              background: colors.error + "20",
              color: colors.error,
              padding: "2px 6px",
              borderRadius: 4,
              marginLeft: 8,
              letterSpacing: 0.5,
              fontWeight: 600,
            }}>
              ZORUNLU
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
          {check.detail}
        </div>
        <div style={{
          fontSize: 10,
          fontFamily: "ui-monospace, monospace",
          color: colors.textSubtle,
          marginTop: 4,
        }}>
          {check.key}
        </div>
      </div>
    </div>
  );
}
