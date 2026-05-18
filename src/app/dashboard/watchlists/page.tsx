"use client";
import { confirmDialog } from "@/components/Confirm";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import { showToast } from "@/components/Toaster";

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

interface Connection { id: string; dbName: string; status: string }

export default function WatchlistsPage() {
  const { t } = useI18n();
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
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          thresholdVal: Number(form.thresholdVal),
          emailTo: form.emailTo || undefined,
        }),
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

  const toggleEnabled = async (w: Watchlist) => {
    const next = !w.enabled;
    // Optimistic update
    setWatchlists((prev) => prev.map((x) => (x.id === w.id ? { ...x, enabled: next } : x)));
    try {
      const res = await fetch(`/api/watchlists/${encodeURIComponent(w.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
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

      <h2 style={{ ...sectionTitle, color: "#94A3B8", marginBottom: 12 }}>{t.watchlists.existingTitle} ({watchlists.length})</h2>
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
                {w.lastRunAt && <> · {new Date(w.lastRunAt).toLocaleString("tr-TR")}</>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <button onClick={() => toggleEnabled(w)} style={btnSecondary}>
                {w.enabled ? t.watchlists.disable : t.watchlists.enable}
              </button>
              <button onClick={() => remove(w.id)} style={btnDanger}>{t.watchlists.delete}</button>
            </div>
          </div>
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
