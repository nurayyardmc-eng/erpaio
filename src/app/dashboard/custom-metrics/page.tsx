"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { confirmDialog } from "@/components/Confirm";
import { showToast } from "@/components/Toaster";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";

/**
 * Custom metrics yönetimi — Track ZZZZ. YYYY engine wiring sundu;
 * şimdi owner/admin için UI list + create + delete.
 *
 * Tenant-özel anomaly metric tanımları. trFatura yerine kendi tablolarını
 * kullanan customer'lar metric tanımlayabilir; engine static + custom
 * union çalıştırır (YYYY).
 */

interface CustomMetric {
  id: string;
  key: string;
  label: string;
  description: string | null;
  schedule: "hourly" | "daily";
  algorithm: "zscore" | "moving_avg" | "threshold";
  direction: "drop" | "spike" | "both";
  sql: string;
  enabled: boolean;
  connectionId: string;
  createdAt: string;
}

interface Connection {
  id: string;
  dbName: string;
  status: string;
}

type Schedule = "hourly" | "daily";
type Algorithm = "zscore" | "moving_avg" | "threshold";
type Direction = "drop" | "spike" | "both";

export default function CustomMetricsPage() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    label: "",
    description: "",
    connectionId: "",
    schedule: "hourly" as Schedule,
    algorithm: "zscore" as Algorithm,
    direction: "both" as Direction,
    sql: "",
  });
  const [submitting, setSubmitting] = useState(false);
  // Track BB — test çalıştır per-metric. Map id → result/loading flag.
  const [testResults, setTestResults] = useState<Record<string, { value: number } | "loading" | "error">>({});

  const refresh = () => {
    Promise.all([
      fetch("/api/custom-metrics").then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
    ]).then(([m, c, me]) => {
      setMetrics(m.metrics ?? []);
      const active = (c as Connection[]).filter((x) => x.status === "active");
      setConnections(active);
      if (active.length > 0 && !form.connectionId) {
        setForm((f) => ({ ...f, connectionId: active[0].id }));
      }
      setUserRole((me as { user?: { role?: string } } | null)?.user?.role ?? null);
      setLoading(false);
    });
  };

  // Initial load — refresh reads form.connectionId only to pick a default.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/custom-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        return;
      }
      showToast(t.customMetrics.createdToast, "success");
      setForm({
        ...form,
        key: "",
        label: "",
        description: "",
        sql: "",
      });
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const runTest = async (m: CustomMetric) => {
    setTestResults((prev) => ({ ...prev, [m.id]: "loading" }));
    try {
      const res = await fetch(`/api/custom-metrics/${encodeURIComponent(m.id)}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        setTestResults((prev) => ({ ...prev, [m.id]: "error" }));
        return;
      }
      setTestResults((prev) => ({ ...prev, [m.id]: { value: data.value } }));
    } catch {
      showToast(t.common.error, "error");
      setTestResults((prev) => ({ ...prev, [m.id]: "error" }));
    }
  };

  const remove = async (m: CustomMetric) => {
    const ok = await confirmDialog({
      title: t.customMetrics.deleteConfirmTitle,
      message: `"${m.label}" ${t.customMetrics.deleteConfirmMessageSuffix}`,
      confirmLabel: t.common.delete,
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/custom-metrics?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
    showToast(t.customMetrics.deletedToast, "success");
    refresh();
  };

  const canManage = userRole === "owner" || userRole === "admin";

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · CUSTOM METRICS</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.customMetrics.title}</h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
        {t.customMetrics.description}
      </p>

      {canManage && (
        <form onSubmit={submit} style={card}>
          <h2 style={sectionTitle}>{t.customMetrics.newTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label={t.customMetrics.fieldKey}>
              <input
                required
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="my_kpi_daily"
                pattern="[a-z0-9_]{3,40}"
                title="lowercase, digits, underscore (3-40)"
                style={input}
              />
            </Field>
            <Field label={t.customMetrics.fieldLabel}>
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={t.customMetrics.fieldLabelPlaceholder}
                style={input}
              />
            </Field>
          </div>
          <Field label={t.customMetrics.fieldDescription}>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t.customMetrics.fieldDescriptionPlaceholder}
              style={input}
            />
          </Field>
          <Field label={t.customMetrics.fieldConnection}>
            <select
              value={form.connectionId}
              onChange={(e) => setForm({ ...form, connectionId: e.target.value })}
              style={input}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.dbName}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Field label={t.customMetrics.fieldSchedule}>
              <select
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value as typeof form.schedule })}
                style={input}
              >
                <option value="hourly">{t.customMetrics.scheduleHourly}</option>
                <option value="daily">{t.customMetrics.scheduleDaily}</option>
              </select>
            </Field>
            <Field label={t.customMetrics.fieldAlgorithm}>
              <select
                value={form.algorithm}
                onChange={(e) => setForm({ ...form, algorithm: e.target.value as typeof form.algorithm })}
                style={input}
              >
                <option value="zscore">zscore</option>
                <option value="moving_avg">moving_avg</option>
                <option value="threshold">threshold</option>
              </select>
            </Field>
            <Field label={t.customMetrics.fieldDirection}>
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as typeof form.direction })}
                style={input}
              >
                <option value="both">{t.customMetrics.directionBoth}</option>
                <option value="drop">{t.customMetrics.directionDrop}</option>
                <option value="spike">{t.customMetrics.directionSpike}</option>
              </select>
            </Field>
          </div>
          <Field label={t.customMetrics.fieldSql}>
            <textarea
              required
              value={form.sql}
              onChange={(e) => setForm({ ...form, sql: e.target.value })}
              placeholder="SELECT COUNT(*) AS metric_value FROM ..."
              rows={5}
              style={{ ...input, fontFamily: "ui-monospace, monospace", minHeight: 100 }}
            />
          </Field>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: "0 0 12px" }}>
            {t.customMetrics.sqlHint}
          </p>
          <button type="submit" disabled={submitting || connections.length === 0} style={btnPrimary}>
            {submitting ? t.common.saving : t.common.save}
          </button>
        </form>
      )}

      <h2 style={{ ...sectionTitle, color: colors.textMuted, marginBottom: 12 }}>
        {t.customMetrics.existingTitle} ({metrics.length})
      </h2>
      {loading ? (
        <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />
      ) : metrics.length === 0 ? (
        <EmptyState
          icon={<Activity size={28} />}
          title={t.customMetrics.emptyTitle}
          description={t.customMetrics.emptyDesc}
        />
      ) : (
        metrics.map((m) => (
          <div key={m.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ color: colors.text, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{m.key}</code>
                  {!m.enabled && <span style={badgeDisabled}>{t.watchlists.disabledBadge}</span>}
                </div>
                <div style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                {m.description && (
                  <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{m.description}</div>
                )}
                <div style={{ color: colors.textMuted, fontSize: 11, marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>· {m.schedule}</span>
                  <span>· {m.algorithm}</span>
                  <span>· {m.direction}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexDirection: "column" }}>
                {canManage && (
                  <button onClick={() => runTest(m)} style={btnSecondary} type="button" disabled={testResults[m.id] === "loading"}>
                    {testResults[m.id] === "loading" ? "..." : t.customMetrics.testRunBtn}
                  </button>
                )}
                {canManage && (
                  <button onClick={() => remove(m)} style={btnDanger}>
                    {t.common.delete}
                  </button>
                )}
              </div>
            </div>
            {testResults[m.id] && testResults[m.id] !== "loading" && testResults[m.id] !== "error" && (
              <div style={{ marginTop: 10, padding: "6px 12px", background: "#D1FAE5", color: "#065F46", borderRadius: 100, fontSize: 12, fontWeight: 600, display: "inline-block" }}>
                {t.customMetrics.testRunResultPrefix} {(testResults[m.id] as { value: number }).value}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ color: colors.textMuted, fontSize: 9, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10,
  padding: 18, marginBottom: 12, maxWidth: 720,
};
const sectionTitle: React.CSSProperties = { fontSize: 13, color: colors.text, marginBottom: 14, fontWeight: 600 };
const input: React.CSSProperties = {
  width: "100%", background: colors.bgSubtle, border: `1px solid ${colors.border}`, borderRadius: 6,
  padding: "8px 10px", color: colors.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: colors.text, color: colors.textInverse, border: "none", borderRadius: 100,
  padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  background: colors.card, border: `1px solid ${colors.border}`,
  borderRadius: 4, padding: "4px 10px", color: colors.text, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};
const badgeDisabled: React.CSSProperties = {
  background: "#F1F5F9", border: "1px solid #E5E7EB", color: "#64748B",
  borderRadius: 100, padding: "1px 8px", fontSize: 9, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase",
};
