"use client";
import { confirmDialog } from "@/components/Confirm";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import { formatTimestamp } from "@/lib/format/time";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { showToast } from "@/components/Toaster";
import { postJson, patchJson } from "@/lib/http/clientFetch";

interface Report {
  id: string;
  name: string;
  question: string;
  schedule: string;
  emailTo: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
}

interface Connection { id: string; dbName: string; status: string }

const SCHEDULE_KEYS = ["hourly", "daily_06", "daily_18", "weekly_monday", "monthly_first"] as const;
type ScheduleKey = (typeof SCHEDULE_KEYS)[number];

function scheduleLabel(t: Dictionary, k: string): string {
  switch (k) {
    case "hourly": return t.scheduledReports.scheduleHourly;
    case "daily_06": return t.scheduledReports.scheduleDaily06;
    case "daily_18": return t.scheduledReports.scheduleDaily18;
    case "weekly_monday": return t.scheduledReports.scheduleWeeklyMonday;
    case "monthly_first": return t.scheduledReports.scheduleMonthlyFirst;
    default: return k;
  }
}

export default function ScheduledReportsPage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    question: "",
    connectionId: "",
    schedule: "daily_06" as ScheduleKey,
    emailTo: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = () => {
    Promise.all([
      fetch("/api/scheduled-reports").then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
    ]).then(([rep, c]) => {
      setReports(rep.reports ?? []);
      const active = (c as Connection[]).filter((x) => x.status === "active");
      setConnections(active);
      if (active.length > 0 && !form.connectionId) setForm((f) => ({ ...f, connectionId: active[0].id }));
      setLoading(false);
    });
  };

  // Initial load on mount; refresh reads form.connectionId only to pick a default.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, []);
  useEffect(() => {
    if (!status) return;
    const tm = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(tm);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await postJson("/api/scheduled-reports", form);
      const data = await res.json();
      if (!res.ok) setStatus({ kind: "err", msg: data.error || t.common.error });
      else {
        setStatus({ kind: "ok", msg: t.scheduledReports.successCreated });
        setForm({ ...form, name: "", question: "", emailTo: "" });
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const _ok = await confirmDialog({ title: t.scheduledReports.deleteConfirmTitle, message: t.scheduledReports.deleteConfirmMessage, confirmLabel: t.scheduledReports.deleteConfirmYes, destructive: true }); if (!_ok) return;
    await fetch(`/api/scheduled-reports?id=${id}`, { method: "DELETE" });
    refresh();
  };

  // Track YY — test run state per-row.
  const [testResults, setTestResults] = useState<Record<string, { rowCount: number } | "loading" | "error">>({});

  const runTest = async (r: Report) => {
    setTestResults((prev) => ({ ...prev, [r.id]: "loading" }));
    try {
      const res = await fetch(`/api/scheduled-reports/${encodeURIComponent(r.id)}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        setTestResults((prev) => ({ ...prev, [r.id]: "error" }));
        return;
      }
      setTestResults((prev) => ({ ...prev, [r.id]: { rowCount: data.rowCount } }));
    } catch {
      showToast(t.common.error, "error");
      setTestResults((prev) => ({ ...prev, [r.id]: "error" }));
    }
  };

  /** Track KK — enable/disable toggle (cron run filtreler, persist yan etki yok). */
  const toggleEnabled = async (r: Report) => {
    const next = !r.enabled;
    // Optimistic update
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: next } : x)));
    try {
      const res = await patchJson(
        `/api/scheduled-reports/${encodeURIComponent(r.id)}`,
        { enabled: next },
      );
      if (!res.ok) {
        // Revert on failure
        setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: r.enabled } : x)));
        showToast(t.common.error, "error");
        return;
      }
      showToast(next ? t.scheduledReports.enabledToast : t.scheduledReports.disabledToast, "success");
    } catch {
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: r.enabled } : x)));
      showToast(t.common.error, "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.scheduledReports.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.scheduledReports.title}</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        {t.scheduledReports.description}
      </p>

      <form onSubmit={submit} style={card}>
        <h2 style={sectionTitle}>{t.scheduledReports.newReport}</h2>
        <Field label={t.scheduledReports.fieldName}>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.scheduledReports.fieldNamePlaceholder} style={input} />
        </Field>
        <Field label={t.scheduledReports.fieldQuestion}>
          <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={t.scheduledReports.fieldQuestionPlaceholder} style={input} />
        </Field>
        <Field label={t.scheduledReports.fieldConnection}>
          <select value={form.connectionId} onChange={(e) => setForm({ ...form, connectionId: e.target.value })} style={input}>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.dbName}</option>)}
          </select>
        </Field>
        <Field label={t.scheduledReports.fieldSchedule}>
          <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as ScheduleKey })} style={input}>
            {SCHEDULE_KEYS.map((k) => <option key={k} value={k}>{scheduleLabel(t, k)}</option>)}
          </select>
        </Field>
        <Field label={t.scheduledReports.fieldEmail}>
          <input required type="email" value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} style={input} />
        </Field>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? t.scheduledReports.submitting : t.scheduledReports.submit}</button>
        {status && <span style={{ marginLeft: 12, color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 11 }}>{status.msg}</span>}
      </form>

      <h2 style={{ ...sectionTitle, color: "#94A3B8", marginBottom: 12 }}>{t.scheduledReports.existingTitle} ({reports.length})</h2>
      {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}
      {!loading && reports.length === 0 && (
        <EmptyState
          icon={<Send size={28} />}
          title={t.scheduledReports.emptyTitle}
          description={t.scheduledReports.emptyDesc}
        />
      )}
      {reports.map((r) => (
        <div key={r.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {r.name}
                {!r.enabled && (
                  <span style={{ background: "#F1F5F9", border: "1px solid #E5E7EB", color: "#64748B", borderRadius: 100, padding: "1px 8px", fontSize: 9, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {t.scheduledReports.disabledBadge}
                  </span>
                )}
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{r.question}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8" }}>
                {scheduleLabel(t, r.schedule)} · {r.emailTo}
                {r.lastRunAt && <> · {t.scheduledReports.lastRunPrefix}{formatTimestamp(r.lastRunAt)}</>}
              </div>
              {r.lastError && <div style={{ color: "#EF4444", fontSize: 10, marginTop: 4 }}>⚠ {r.lastError}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexDirection: "column" }}>
              <button onClick={() => runTest(r)} style={btnSecondary} type="button" disabled={testResults[r.id] === "loading"}>
                {testResults[r.id] === "loading" ? "..." : t.scheduledReports.testRunBtn}
              </button>
              <button onClick={() => toggleEnabled(r)} style={btnSecondary}>
                {r.enabled ? t.scheduledReports.disable : t.scheduledReports.enable}
              </button>
              <button onClick={() => remove(r.id)} style={btnDanger}>{t.scheduledReports.delete}</button>
            </div>
          </div>
          {testResults[r.id] && testResults[r.id] !== "loading" && testResults[r.id] !== "error" && (
            <div style={{ marginTop: 10, padding: "6px 12px", background: "#D1FAE5", color: "#065F46", borderRadius: 100, fontSize: 12, fontWeight: 600, display: "inline-block" }}>
              {t.scheduledReports.testRunResultPrefix} {(testResults[r.id] as { rowCount: number }).rowCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ color: "#94A3B8", fontSize: 9, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 18, marginBottom: 12, maxWidth: 700 };
const sectionTitle: React.CSSProperties = { fontSize: 13, color: "#0A0A0A", marginBottom: 14, fontWeight: 600 };
const input: React.CSSProperties = { width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const btnPrimary: React.CSSProperties = { background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6, padding: "8px 16px", color: "#0A0A0A", fontSize: 12, cursor: "pointer", fontFamily: "inherit" };
const btnDanger: React.CSSProperties = { background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit" };
const btnSecondary: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 4, padding: "4px 10px", color: "#0F172A", fontSize: 10, cursor: "pointer", fontFamily: "inherit" };
