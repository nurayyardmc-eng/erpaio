"use client";
import { cloneElement, isValidElement, useEffect, useId, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { confirmDialog } from "@/components/Confirm";
import { showToast } from "@/components/Toaster";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";
import { isOwnerOrAdmin } from "@/lib/auth/role";
import { postJson } from "@/lib/http/clientFetch";

/**
 * Slack / Teams / generic-webhook integration config UI. The backend
 * (GET/POST/DELETE /api/integrations + POST /api/integrations/test) already
 * existed and was only reachable via the API — this page wires it up.
 */
type Kind = "slack" | "teams" | "webhook";

interface Integration {
  id: string;
  kind: Kind;
  enabled: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export default function IntegrationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: "slack" as Kind, endpoint: "", secret: "" });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  const refresh = () => {
    Promise.all([
      fetch("/api/integrations").then((r) => (r.ok ? r.json() : { integrations: [] })),
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
    ]).then(([data, me]) => {
      setItems(data.integrations ?? []);
      setUserRole((me as { user?: { role?: string } } | null)?.user?.role ?? null);
      setLoading(false);
    });
  };

  useEffect(refresh, []);

  const canManage = isOwnerOrAdmin(userRole);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await postJson("/api/integrations", {
        kind: form.kind,
        endpoint: form.endpoint,
        secret: form.secret || undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        return;
      }
      showToast(t.integrations.savedToast, "success");
      setForm({ ...form, endpoint: "", secret: "" });
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (it: Integration) => {
    const ok = await confirmDialog({
      title: t.integrations.deleteConfirmTitle,
      message: `${it.kind} ${t.integrations.deleteConfirmSuffix}`,
      confirmLabel: t.common.delete,
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/integrations?kind=${encodeURIComponent(it.kind)}`, { method: "DELETE" });
    showToast(t.integrations.deletedToast, "success");
    refresh();
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await postJson("/api/integrations/test", {});
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        return;
      }
      showToast(t.integrations.testSentToast, "success");
      refresh();
    } finally {
      setTesting(false);
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : t.integrations.never);

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · INTEGRATIONS</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.integrations.title}</h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
        {t.integrations.description}
      </p>

      {canManage && (
        <form onSubmit={submit} style={card}>
          <h2 style={sectionTitle}>{t.integrations.newTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
            <Field label={t.integrations.fieldKind}>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
                style={input}
              >
                <option value="slack">Slack</option>
                <option value="teams">Teams</option>
                <option value="webhook">Webhook</option>
              </select>
            </Field>
            <Field label={t.integrations.fieldEndpoint}>
              <input
                required
                type="url"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                style={input}
              />
            </Field>
          </div>
          {form.kind === "webhook" && (
            <Field label={t.integrations.fieldSecret}>
              <input
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={t.integrations.secretPlaceholder}
                style={input}
              />
            </Field>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={submitting} style={btnPrimary}>
              {submitting ? "..." : t.integrations.saveBtn}
            </button>
            {items.length > 0 && (
              <button type="button" onClick={sendTest} disabled={testing} style={btnSecondary}>
                {testing ? "..." : t.integrations.testBtn}
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: "10px 0 0" }}>{t.integrations.formHint}</p>
        </form>
      )}

      <h2 style={{ ...sectionTitle, color: colors.textMuted, marginBottom: 12 }}>{t.integrations.listTitle}</h2>

      {loading ? null : items.length === 0 ? (
        <EmptyState title={t.integrations.emptyTitle} description={t.integrations.emptyDesc} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <div key={it.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{it.kind}</span>
                  {!it.enabled && <span style={badgeDisabled}>{t.integrations.disabledBadge}</span>}
                </div>
                <div style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
                  {t.integrations.lastSuccessPrefix} {fmt(it.lastSuccessAt)}
                </div>
                {it.lastError && (
                  <div style={{ color: "#B91C1C", fontSize: 11, marginTop: 4 }}>
                    {t.integrations.lastErrorPrefix} {it.lastError} ({fmt(it.lastErrorAt)})
                  </div>
                )}
              </div>
              {canManage && (
                <button onClick={() => remove(it)} style={btnDanger}>{t.common.delete}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} style={{ color: colors.textMuted, fontSize: 9, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {isValidElement(children) ? cloneElement(children as React.ReactElement<{ id?: string }>, { id: fieldId }) : children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10,
  padding: 20, marginBottom: 24, maxWidth: 720,
};
const sectionTitle: React.CSSProperties = { fontSize: 13, color: colors.text, marginBottom: 14, fontWeight: 600 };
const input: React.CSSProperties = {
  width: "100%", background: colors.bgSubtle, border: `1px solid ${colors.border}`, borderRadius: 6,
  padding: "8px 10px", color: colors.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: colors.text, color: colors.textInverse, border: "none", borderRadius: 100,
  padding: "8px 18px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  background: colors.card, border: `1px solid ${colors.border}`,
  borderRadius: 100, padding: "8px 18px", color: colors.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 4,
  padding: "4px 10px", color: "#B91C1C", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
};
const badgeDisabled: React.CSSProperties = {
  fontSize: 9, letterSpacing: 1, color: colors.textMuted, border: `1px solid ${colors.border}`,
  borderRadius: 100, padding: "1px 8px",
};
