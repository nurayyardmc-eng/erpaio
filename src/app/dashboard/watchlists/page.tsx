"use client";
import { useEffect, useState } from "react";

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
        setStatus({ kind: "err", msg: data.error || "Hata" });
      } else {
        setStatus({ kind: "ok", msg: "Watchlist eklendi." });
        setForm({ ...form, name: "", question: "", thresholdVal: 0, emailTo: "" });
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu watchlist'i silmek istediğine emin misin?")) return;
    await fetch(`/api/watchlists?id=${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · WATCHLIST</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Eşik İzleme</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24, maxWidth: 700 }}>
        Bir sorgunun sonucu eşiği aştığında otomatik alert + email + push notification. Günde bir kez kontrol edilir.
      </p>

      <form onSubmit={submit} style={card}>
        <h2 style={sectionTitle}>Yeni Watchlist</h2>
        <Field label="ADI">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Stok kritik altına düştü" style={input} />
        </Field>
        <Field label="SORU (önceden chat'te sorulmuş olmalı)">
          <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Mevcut stok adedi" style={input} />
        </Field>
        <Field label="BAĞLANTI">
          <select value={form.connectionId} onChange={(e) => setForm({ ...form, connectionId: e.target.value })} style={input}>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.dbName}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Field label="OP">
            <select value={form.thresholdOp} onChange={(e) => setForm({ ...form, thresholdOp: e.target.value as typeof form.thresholdOp })} style={input}>
              <option value="lt">&lt;</option>
              <option value="lte">≤</option>
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="eq">=</option>
            </select>
          </Field>
          <div style={{ flex: 1 }}>
            <Field label="EŞİK">
              <input required type="number" value={form.thresholdVal} onChange={(e) => setForm({ ...form, thresholdVal: Number(e.target.value) })} style={input} />
            </Field>
          </div>
        </div>
        <Field label="EMAIL (opsiyonel)">
          <input type="email" value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} placeholder="boş = sadece push + alert" style={input} />
        </Field>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "..." : "Ekle"}</button>
        {status && <span style={{ marginLeft: 12, color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 11 }}>{status.msg}</span>}
      </form>

      <h2 style={{ ...sectionTitle, color: "#94A3B8", marginBottom: 12 }}>Mevcut Watchlists ({watchlists.length})</h2>
      {loading && <div style={{ color: "#94A3B8" }}>Yükleniyor...</div>}
      {!loading && watchlists.length === 0 && <div style={{ color: "#94A3B8", fontSize: 12 }}>Henüz watchlist yok.</div>}
      {watchlists.map((w) => (
        <div key={w.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600 }}>{w.name}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{w.question}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8" }}>
                Tetikleme: <code style={{ color: "#0A0A0A" }}>{w.thresholdOp} {w.thresholdVal}</code>
                {w.lastValue !== null && (<> · Son: <code style={{ color: w.triggeredAt ? "#F59E0B" : "#475569" }}>{w.lastValue}</code></>)}
                {w.lastRunAt && <> · {new Date(w.lastRunAt).toLocaleString("tr-TR")}</>}
              </div>
            </div>
            <button onClick={() => remove(w.id)} style={btnDanger}>Sil</button>
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
