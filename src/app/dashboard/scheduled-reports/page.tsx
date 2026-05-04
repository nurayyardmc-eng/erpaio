"use client";
import { confirmDialog } from "@/components/Confirm";
import { useEffect, useState } from "react";

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

const SCHEDULES: Record<string, string> = {
  hourly: "Her saat",
  daily_06: "Her gün 09:00",
  daily_18: "Her gün 21:00",
  weekly_monday: "Her Pazartesi 09:00",
  monthly_first: "Her ayın 1'i 09:00",
};

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    question: "",
    connectionId: "",
    schedule: "daily_06" as keyof typeof SCHEDULES,
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

  useEffect(refresh, []);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setStatus({ kind: "err", msg: data.error || "Hata" });
      else {
        setStatus({ kind: "ok", msg: "Rapor planlandı." });
        setForm({ ...form, name: "", question: "", emailTo: "" });
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const _ok = await confirmDialog({ title: "Raporu sil?", message: "Periyodik rapor kalıcı silinir.", confirmLabel: "Evet, sil", destructive: true }); if (!_ok) return;
    await fetch(`/api/scheduled-reports?id=${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · RAPOR</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Planlı Raporlar</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        Belirli bir soruyu seçtiğin sıklıkta çalıştırıp emailine gönderir. Soru
        önce chat'te sorulmuş ve cache'lenmiş olmalı.
      </p>

      <form onSubmit={submit} style={card}>
        <h2 style={sectionTitle}>Yeni Rapor</h2>
        <Field label="ADI">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Haftalık satış özeti" style={input} />
        </Field>
        <Field label="SORU">
          <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Bu hafta satış toplamı" style={input} />
        </Field>
        <Field label="BAĞLANTI">
          <select value={form.connectionId} onChange={(e) => setForm({ ...form, connectionId: e.target.value })} style={input}>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.dbName}</option>)}
          </select>
        </Field>
        <Field label="ZAMAN">
          <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as keyof typeof SCHEDULES })} style={input}>
            {Object.entries(SCHEDULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="EMAIL">
          <input required type="email" value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} style={input} />
        </Field>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "..." : "Planla"}</button>
        {status && <span style={{ marginLeft: 12, color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 11 }}>{status.msg}</span>}
      </form>

      <h2 style={{ ...sectionTitle, color: "#94A3B8", marginBottom: 12 }}>Mevcut Raporlar ({reports.length})</h2>
      {loading && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}
      {!loading && reports.length === 0 && <div style={{ color: "#94A3B8", fontSize: 12 }}>Henüz rapor yok.</div>}
      {reports.map((r) => (
        <div key={r.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{r.question}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8" }}>
                {SCHEDULES[r.schedule] ?? r.schedule} · {r.emailTo}
                {r.lastRunAt && <> · son: {new Date(r.lastRunAt).toLocaleString("tr-TR")}</>}
              </div>
              {r.lastError && <div style={{ color: "#EF4444", fontSize: 10, marginTop: 4 }}>⚠ {r.lastError}</div>}
            </div>
            <button onClick={() => remove(r.id)} style={btnDanger}>Sil</button>
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

const card: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 18, marginBottom: 12, maxWidth: 700 };
const sectionTitle: React.CSSProperties = { fontSize: 13, color: "#0A0A0A", marginBottom: 14, fontWeight: 600 };
const input: React.CSSProperties = { width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const btnPrimary: React.CSSProperties = { background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6, padding: "8px 16px", color: "#0A0A0A", fontSize: 12, cursor: "pointer", fontFamily: "inherit" };
const btnDanger: React.CSSProperties = { background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 4, padding: "4px 10px", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit" };
