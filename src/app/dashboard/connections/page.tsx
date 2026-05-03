"use client";
import { useState, useEffect } from "react";

interface Connection {
  id: string;
  erpType: string;
  host: string;
  dbName: string;
  status: string;
  lastSync?: string;
  createdAt: string;
}

type Toast = { kind: "ok" | "err" | "info"; msg: string } | null;

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [form, setForm] = useState({
    erpType: "nebim_v3",
    host: "",
    port: 1433,
    dbName: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/connections").then((r) => r.json()).then(setConnections);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setToast({ kind: "err", msg: data.error || "Bağlantı eklenemedi." });
        return;
      }
      setToast({ kind: "info", msg: "Bağlantı eklendi, test ediliyor..." });
      const test = await fetch(`/api/connections/${data.id}/test`);
      const testData = await test.json();
      if (testData.ok) {
        setToast({ kind: "ok", msg: `Bağlantı başarılı! ${testData.tableCount} tablo bulundu.` });
        setForm({ erpType: "nebim_v3", host: "", port: 1433, dbName: "", username: "", password: "" });
      } else {
        setToast({ kind: "err", msg: "Bağlantı başarısız. Bilgileri kontrol edin." });
      }
      const updated = await fetch("/api/connections").then((r) => r.json());
      setConnections(updated);
    } catch (err) {
      setToast({ kind: "err", msg: err instanceof Error ? err.message : "Ağ hatası." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      fontFamily: "inherit",
      color: "#0F172A",
      padding: 40,
    }}>
      <div style={{ color: "#1A2B47", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>ERP Bağlantıları</h1>

      {toast && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            border: `1px solid ${toast.kind === "ok" ? "#10B98140" : toast.kind === "err" ? "#EF444440" : "#1A2B4740"}`,
            background: toast.kind === "ok" ? "#10B98115" : toast.kind === "err" ? "#EF444415" : "#1A2B4715",
            color: toast.kind === "ok" ? "#10B981" : toast.kind === "err" ? "#EF4444" : "#1A2B47",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Form */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24, maxWidth: 500, marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16, color: "#1A2B47" }}>Yeni Bağlantı Ekle</h2>
        <form onSubmit={handleSubmit}>
          {[
            { label: "ERP Tipi", key: "erpType", type: "select" },
            { label: "Host / IP", key: "host", type: "text" },
            { label: "Port", key: "port", type: "number" },
            { label: "Veritabanı Adı", key: "dbName", type: "text" },
            { label: "Kullanıcı Adı", key: "username", type: "text" },
            { label: "Şifre", key: "password", type: "password" },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ color: "#94A3B8", fontSize: 11, display: "block", marginBottom: 4 }}>{label.toUpperCase()}</label>
              {type === "select" ? (
                <select
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 12px", color: "#0F172A", fontSize: 12, fontFamily: "inherit" }}
                >
                  <option value="nebim_v3">Nebim V3</option>
                  <option value="sap">SAP</option>
                  <option value="dynamics365">Dynamics 365</option>
                </select>
              ) : (
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                  style={{ width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 12px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }}
                  required
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 8, width: "100%", background: "#1A2B4718", border: "1px solid #1A2B4740", borderRadius: 6, padding: "10px", color: "#1A2B47", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Bağlanıyor..." : "Bağlantı Ekle →"}
          </button>
        </form>
      </div>

      {/* Connections List */}
      {connections.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, marginBottom: 12, color: "#94A3B8" }}>Mevcut Bağlantılar</h2>
          {connections.map((conn: any) => (
            <div key={conn.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{conn.dbName}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{conn.host} · {conn.erpType}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: conn.status === "active" ? "#10B98120" : "#EF444420", color: conn.status === "active" ? "#10B981" : "#EF4444" }}>
                {conn.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}