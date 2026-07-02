"use client";
import { confirmDialog } from "@/components/Confirm";
import { cloneElement, isValidElement, useEffect, useId, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import { formatTimestamp } from "@/lib/format/time";
import { showToast } from "@/components/Toaster";
import { computeSparkline } from "@/lib/watchlist/sparkline";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";
import { postJson, patchJson } from "@/lib/http/clientFetch";

interface Watchlist {
  id: string;
  name: string;
  question: string;
  thresholdOp: string;
  thresholdVal: number;
  emailTo: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastValue: number | null;
  triggeredAt: string | null;
}

interface Trigger {
  id: string;
  value: number;
  thresholdOp: string;
  thresholdVal: number;
  triggeredAt: string;
}

interface Connection { id: string; dbName: string; status: string }

export default function WatchlistsPage() {
  const { t, locale } = useI18n();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    question: "",
    connectionId: "",
    thresholdOp: "gt" as "lt" | "lte" | "gt" | "gte" | "eq",
    thresholdVal: 0,
    emailTo: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  // Inline edit state — sadece bir satır aynı anda edit edilebilir.
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    question: "",
    thresholdOp: "gt" as "lt" | "lte" | "gt" | "gte" | "eq",
    thresholdVal: 0,
    emailTo: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  // Track NNNN — trigger history (sadece edit modunda yüklenir).
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [triggersLoading, setTriggersLoading] = useState(false);
  // Track AA — test çalıştır state.
  const [testResult, setTestResult] = useState<{ value: number; wouldTrigger: boolean } | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const refresh = () => {
    Promise.all([
      fetch("/api/watchlists").then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
    ]).then(([w, c]) => {
      setWatchlists(w.watchlists ?? []);
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
      const res = await postJson("/api/watchlists", {
        ...form,
        thresholdVal: Number(form.thresholdVal),
        emailTo: form.emailTo || undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", msg: data.error || t.common.error });
      } else {
        setStatus({ kind: "ok", msg: t.watchlists.successCreated });
        setForm({ ...form, name: "", question: "", thresholdVal: 0, emailTo: "" });
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const _ok = await confirmDialog({ title: t.watchlists.deleteConfirmTitle, message: t.watchlists.deleteConfirmMessage, confirmLabel: t.watchlists.deleteConfirmYes, destructive: true }); if (!_ok) return;
    await fetch(`/api/watchlists?id=${id}`, { method: "DELETE" });
    refresh();
  };

  const startEdit = (w: Watchlist) => {
    setEditId(w.id);
    setEditForm({
      name: w.name,
      question: w.question,
      thresholdOp: w.thresholdOp as "lt" | "lte" | "gt" | "gte" | "eq",
      thresholdVal: w.thresholdVal,
      emailTo: w.emailTo ?? "",
    });
    // Trigger history lazy-load (Track NNNN). Edit modu kapatılınca state
    // temizlenir; her edit açılışında fresh fetch yapılır.
    setTriggers([]);
    setTriggersLoading(true);
    setTestResult(null);
    fetch(`/api/watchlists/${encodeURIComponent(w.id)}/triggers`)
      .then((r) => r.ok ? r.json() : { triggers: [] })
      .then((d: { triggers: Trigger[] }) => setTriggers(d.triggers ?? []))
      .catch(() => setTriggers([]))
      .finally(() => setTriggersLoading(false));
  };

  const cancelEdit = () => {
    setEditId(null);
    setTriggers([]);
    setTestResult(null);
  };

  /**
   * Track AA — preview run. Cron'u beklemeden anlık SQL + threshold check.
   * Result inline gösterilir (yeşil "tetiklenir" / gri "tetiklenmez"). Persist
   * yok — Watchlist.lastValue değişmez.
   */
  const runTest = async (id: string) => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/watchlists/${encodeURIComponent(id)}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        return;
      }
      setTestResult({ value: data.value, wouldTrigger: data.wouldTrigger });
    } catch {
      showToast(t.common.error, "error");
    } finally {
      setTestRunning(false);
    }
  };

  const saveEdit = async (id: string) => {
    setEditSaving(true);
    try {
      const res = await patchJson(`/api/watchlists/${encodeURIComponent(id)}`, {
        name: editForm.name,
        question: editForm.question,
        thresholdOp: editForm.thresholdOp,
        thresholdVal: Number(editForm.thresholdVal),
        // Boş string → null (email kaldır), dolu → email (PATCH şeması validate eder).
        emailTo: editForm.emailTo ? editForm.emailTo : null,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t.common.error, "error");
        return;
      }
      showToast(t.watchlists.updatedToast, "success");
      setEditId(null);
      setTriggers([]);
      refresh();
    } catch {
      showToast(t.common.error, "error");
    } finally {
      setEditSaving(false);
    }
  };

  /** Track PP — watchlist list CSV export. Quick audit / report. */
  const exportCsv = () => {
    if (watchlists.length === 0) return;
    const rows = watchlists.map((w) => ({
      name: w.name,
      question: w.question,
      thresholdOp: w.thresholdOp,
      thresholdVal: w.thresholdVal,
      emailTo: w.emailTo ?? "",
      enabled: String(w.enabled),
      lastRunAt: w.lastRunAt ?? "",
      lastValue: w.lastValue ?? "",
      triggeredAt: w.triggeredAt ?? "",
    }));
    const csv = rowsToCsv(rows, ["name", "question", "thresholdOp", "thresholdVal", "emailTo", "enabled", "lastRunAt", "lastValue", "triggeredAt"]);
    downloadCsv(exportFilename("watchlists", "csv"), csv);
  };

  const toggleEnabled = async (w: Watchlist) => {
    const next = !w.enabled;
    // Optimistic update
    setWatchlists((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: next } : x)));
    try {
      const res = await patchJson(`/api/watchlists/${encodeURIComponent(w.id)}`, { enabled: next });
      if (!res.ok) {
        // Revert on failure
        setWatchlists((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: w.enabled } : x)));
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t.common.error, "error");
        return;
      }
      showToast(next ? t.watchlists.enabledToast : t.watchlists.disabledToast, "success");
    } catch {
      setWatchlists((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: w.enabled } : x)));
      showToast(t.common.error, "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.watchlists.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.watchlists.title}</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        {t.watchlists.description}
      </p>

      <form onSubmit={submit} style={card}>
        <h2 style={sectionTitle}>{t.watchlists.newWatchlist}</h2>
        <Field label={t.watchlists.fieldName}>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.watchlists.fieldNamePlaceholder} style={input} />
        </Field>
        <Field label={t.watchlists.fieldQuestion}>
          <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={t.watchlists.fieldQuestionPlaceholder} style={input} />
        </Field>
        <Field label={t.watchlists.fieldConnection}>
          <select value={form.connectionId} onChange={(e) => setForm({ ...form, connectionId: e.target.value })} style={input}>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.dbName}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Field label={t.watchlists.fieldOp}>
            <select value={form.thresholdOp} onChange={(e) => setForm({ ...form, thresholdOp: e.target.value as typeof form.thresholdOp })} style={input}>
              <option value="lt">&lt;</option>
              <option value="lte">≤</option>
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="eq">=</option>
            </select>
          </Field>
          <div style={{ flex: 1 }}>
            <Field label={t.watchlists.fieldThreshold}>
              <input required type="number" value={form.thresholdVal} onChange={(e) => setForm({ ...form, thresholdVal: Number(e.target.value) })} style={input} />
            </Field>
          </div>
        </div>
        <Field label={t.watchlists.fieldEmail}>
          <input type="email" value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} placeholder={t.watchlists.fieldEmailPlaceholder} style={input} />
        </Field>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? t.watchlists.submitting : t.watchlists.submit}</button>
        {status && <span style={{ marginLeft: 12, color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 11 }}>{status.msg}</span>}
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ ...sectionTitle, color: "#94A3B8", marginBottom: 0 }}>{t.watchlists.existingTitle} ({watchlists.length})</h2>
        {watchlists.length > 0 && (
          <button
            onClick={exportCsv}
            style={{ padding: "4px 12px", borderRadius: 100, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ {t.audit.exportCsv}
          </button>
        )}
      </div>
      {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}
      {!loading && watchlists.length === 0 && (
        <EmptyState
          icon={<Eye size={28} />}
          title={t.watchlists.emptyTitle}
          description={t.watchlists.emptyDesc}
        />
      )}
      {watchlists.map((w) => (
        <div key={w.id} style={card}>
          {editId === w.id ? (
            <div>
              <Field label={t.watchlists.fieldName}>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={input} />
              </Field>
              <Field label={t.watchlists.fieldQuestion}>
                <input value={editForm.question} onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} style={input} />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Field label={t.watchlists.fieldOp}>
                  <select value={editForm.thresholdOp} onChange={(e) => setEditForm({ ...editForm, thresholdOp: e.target.value as typeof editForm.thresholdOp })} style={input}>
                    <option value="lt">&lt;</option>
                    <option value="lte">≤</option>
                    <option value="gt">&gt;</option>
                    <option value="gte">≥</option>
                    <option value="eq">=</option>
                  </select>
                </Field>
                <div style={{ flex: 1 }}>
                  <Field label={t.watchlists.fieldThreshold}>
                    <input type="number" value={editForm.thresholdVal} onChange={(e) => setEditForm({ ...editForm, thresholdVal: Number(e.target.value) })} style={input} />
                  </Field>
                </div>
              </div>
              <Field label={t.watchlists.fieldEmail}>
                <input type="email" value={editForm.emailTo} onChange={(e) => setEditForm({ ...editForm, emailTo: e.target.value })} placeholder={t.watchlists.fieldEmailPlaceholder} style={input} />
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => saveEdit(w.id)} disabled={editSaving} style={btnPrimary}>
                  {editSaving ? t.common.saving : t.common.save}
                </button>
                <button onClick={cancelEdit} disabled={editSaving} style={btnSecondary}>
                  {t.common.cancel}
                </button>
                <button onClick={() => runTest(w.id)} disabled={testRunning || editSaving} style={btnSecondary} type="button">
                  {testRunning ? "..." : t.watchlists.testRunBtn}
                </button>
                {testResult && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: testResult.wouldTrigger ? "#10B981" : "#737373",
                    padding: "4px 10px",
                    background: testResult.wouldTrigger ? "#D1FAE5" : "#F1F5F9",
                    borderRadius: 100,
                  }}>
                    {t.watchlists.testRunResultPrefix} {testResult.value} —{" "}
                    {testResult.wouldTrigger ? t.watchlists.testRunWouldTrigger : t.watchlists.testRunNoTrigger}
                  </span>
                )}
              </div>

              {/* Track NNNN — Trigger history (son 50). Hep gösterilir;
                  henüz tetiklenmediyse empty state. Threshold tweak yaparken
                  user bu listede geçmiş hit'leri görür → bilinçli karar verir.
                  Track XXXX — sparkline list'in üstünde, threshold çizgisi
                  ile visual tuning hint. */}
              <div style={triggerHistoryBox}>
                <div style={triggerHistoryTitle}>{t.watchlists.triggerHistoryTitle}</div>
                {triggersLoading ? (
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>{t.common.loading}</div>
                ) : triggers.length === 0 ? (
                  <div style={{ color: "#94A3B8", fontSize: 11, fontStyle: "italic" }}>
                    {t.watchlists.triggerHistoryEmpty}
                  </div>
                ) : (
                  <div>
                    <TriggerSparkline triggers={triggers} thresholdVal={editForm.thresholdVal} />
                    {triggers.map((tr) => (
                      <div key={tr.id} style={triggerRow}>
                        <code style={{ color: "#0F172A", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
                          {tr.value} {tr.thresholdOp} {tr.thresholdVal}
                        </code>
                        <span style={{ color: "#94A3B8", fontSize: 10 }}>
                          {new Date(tr.triggeredAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                        </span>
                      </div>
                    ))}
                    {triggers.length === 50 && (
                      <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 6, fontStyle: "italic" }}>
                        {t.watchlists.triggerHistoryCap}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  {w.name}
                  {!w.enabled && (
                    <span style={badgeDisabled}>{t.watchlists.disabledBadge}</span>
                  )}
                </div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{w.question}</div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8" }}>
                  {t.watchlists.triggerLabel}: <code style={{ color: "#0A0A0A" }}>{w.thresholdOp} {w.thresholdVal}</code>
                  {w.lastValue !== null && (<> · {t.watchlists.lastValueLabel}: <code style={{ color: w.triggeredAt ? "#F59E0B" : "#475569" }}>{w.lastValue}</code></>)}
                  {w.lastRunAt && <> · {formatTimestamp(w.lastRunAt)}</>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <button onClick={() => startEdit(w)} style={btnSecondary}>
                  {t.common.edit}
                </button>
                <button onClick={() => toggleEnabled(w)} style={btnSecondary}>
                  {w.enabled ? t.watchlists.disable : t.watchlists.enable}
                </button>
                <button onClick={() => remove(w.id)} style={btnDanger}>{t.watchlists.delete}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Track XXXX — value-over-time sparkline. 40px yüksek inline SVG.
 * Trigger değerlerini en eski → en yeni soldan sağa çizer; threshold çizgisi
 * dashed amber. Tek nokta = dot; çoklu = polyline.
 */
function TriggerSparkline({
  triggers,
  thresholdVal,
}: {
  triggers: Trigger[];
  thresholdVal: number;
}) {
  const data = useMemo(
    () => computeSparkline(triggers, thresholdVal),
    [triggers, thresholdVal],
  );

  if (!data.hasData) return null;

  const W = 280;
  const H = 40;
  const PAD = 4;

  const xPx = (x: number) => PAD + x * (W - 2 * PAD);
  // SVG y ekseni ters çevrilir (0 üstte) — line/threshold tepeyi gösterir.
  const yPx = (y: number) => H - PAD - y * (H - 2 * PAD);

  const polyline = data.points.map((p) => `${xPx(p.x)},${yPx(p.y)}`).join(" ");
  const thresholdYpx = yPx(data.thresholdY);

  return (
    <div style={{ marginBottom: 12 }}>
      <svg width={W} height={H} role="img" aria-label="Trigger value over time">
        {/* Threshold reference line — dashed amber */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={thresholdYpx}
          y2={thresholdYpx}
          stroke="#F59E0B"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {data.points.length === 1 ? (
          <circle cx={xPx(data.points[0].x)} cy={yPx(data.points[0].y)} r={3} fill="#0A0A0A" />
        ) : (
          <>
            <polyline points={polyline} fill="none" stroke="#0A0A0A" strokeWidth={1.5} />
            {data.points.map((p, i) => (
              <circle key={i} cx={xPx(p.x)} cy={yPx(p.y)} r={2} fill="#0A0A0A" />
            ))}
          </>
        )}
      </svg>
      <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>
        min: {data.minVal} · max: {data.maxVal}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const fieldId = useId();
  return (
    <div style={{ marginBottom: 10 }}>
      <label htmlFor={fieldId} style={{ color: "#94A3B8", fontSize: 9, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {isValidElement(children) ? cloneElement(children as React.ReactElement<{ id?: string }>, { id: fieldId }) : children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10,
  padding: 18, marginBottom: 12, maxWidth: 700,
};
const sectionTitle: React.CSSProperties = { fontSize: 13, color: "#0A0A0A", marginBottom: 14, fontWeight: 600 };
const input: React.CSSProperties = {
  width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6,
  padding: "8px 10px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6,
  padding: "8px 16px", color: "#0A0A0A", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E5E7EB",
  borderRadius: 4, padding: "4px 10px", color: "#0F172A", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};
const badgeDisabled: React.CSSProperties = {
  background: "#F1F5F9", border: "1px solid #E5E7EB", color: "#64748B",
  borderRadius: 100, padding: "1px 8px", fontSize: 9, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase",
};
const triggerHistoryBox: React.CSSProperties = {
  marginTop: 16, paddingTop: 14, borderTop: "1px solid #E5E7EB",
};
const triggerHistoryTitle: React.CSSProperties = {
  color: "#475569", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
  fontWeight: 600, marginBottom: 8,
};
const triggerRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "4px 0", borderBottom: "1px solid #F1F5F9",
};
