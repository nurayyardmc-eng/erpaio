"use client";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useI18n } from "@/lib/i18n/context";
import { formatTimestamp } from "@/lib/format/time";
import { putJson } from "@/lib/http/clientFetch";

interface Annotation {
  id: string;
  tableName: string;
  columnName: string | null;
  description: string | null;
  hidden: boolean;
  updatedAt: string;
}

export default function AnnotationsPage() {
  const { t } = useI18n();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ tableName: "", columnName: "", description: "", hidden: false });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(false);
    fetch("/api/annotations")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setAnnotations(d.annotations ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Mount-only initial load; refresh() performs async state hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  useEffect(() => {
    if (!status) return;
    const tm = setTimeout(() => setStatus(null), 3000);
    return () => clearTimeout(tm);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tableName.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await putJson("/api/annotations", {
        tableName: form.tableName.trim(),
        columnName: form.columnName.trim() || null,
        description: form.description.trim() || null,
        hidden: form.hidden,
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", msg: d.error || t.annotations.saveFailed });
      } else {
        setStatus({ kind: "ok", msg: t.annotations.successSaved });
        setForm({ tableName: "", columnName: "", description: "", hidden: false });
        refresh();
      }
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : t.common.error });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Annotation) => {
    const params = new URLSearchParams({ tableName: a.tableName });
    if (a.columnName) params.set("columnName", a.columnName);
    await fetch(`/api/annotations?${params}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.annotations.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{t.annotations.title}</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        {t.annotations.description}
      </p>

      <form onSubmit={submit} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24, maxWidth: 600, marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16, color: "#0A0A0A" }}>{t.annotations.newAnnotation}</h2>

        <Field label={t.annotations.fieldTable}>
          <input
            value={form.tableName}
            onChange={(e) => setForm({ ...form, tableName: e.target.value })}
            placeholder={t.annotations.fieldTablePlaceholder}
            style={inputStyle}
            required
          />
        </Field>

        <Field label={t.annotations.fieldColumn}>
          <input
            value={form.columnName}
            onChange={(e) => setForm({ ...form, columnName: e.target.value })}
            placeholder={t.annotations.fieldColumnPlaceholder}
            style={inputStyle}
          />
        </Field>

        <Field label={t.annotations.fieldDescription}>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t.annotations.fieldDescriptionPlaceholder}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={form.hidden}
            onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
          />
          <span>{t.annotations.hideCheckbox}</span>
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={saving}
            style={{ background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6, padding: "10px 20px", color: "#0A0A0A", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >
            {saving ? t.annotations.submitting : t.annotations.submit}
          </button>
          {status && (
            <span style={{ color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 11 }}>
              {status.msg}
            </span>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>{t.annotations.existingTitle} ({annotations.length})</h2>

      {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}

      {!loading && error && <ErrorState onRetry={refresh} />}

      {!loading && !error && annotations.length === 0 && (
        <EmptyState
          icon={<FileText size={28} />}
          title={t.annotations.emptyTitle}
          description={t.annotations.emptyDesc}
        />
      )}

      {annotations.map((a) => (
        <div key={a.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#0A0A0A", marginBottom: 4 }}>
                {a.tableName}{a.columnName ? `.${a.columnName}` : ""}
                {a.hidden && <span style={{ color: "#EF4444", marginLeft: 8 }}>{t.annotations.hiddenBadge}</span>}
              </div>
              {a.description && (
                <div style={{ fontSize: 12, color: "#475569" }}>{a.description}</div>
              )}
              <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 4 }}>
                {formatTimestamp(a.updatedAt)}
              </div>
            </div>
            <button
              onClick={() => remove(a)}
              style={{ background: "transparent", border: "1px solid #EF444440", borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
            >
              {t.annotations.delete}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: "#94A3B8", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4, textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#0F172A",
  fontSize: 12,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};
