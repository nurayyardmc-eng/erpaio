"use client";
import { useState, useEffect } from "react";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    erpType: "nebim_v3",
    host: "",
    port: 1433,
    dbName: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then(setConnections);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.id) {
      alert("Bağlantı eklendi! Test ediliyor...");
      const test = await fetch(`/api/connections/${data.id}/test`);
      const testData = await test.json();
      if (testData.ok) {
        alert(`✅ Bağlantı başarılı! ${testData.tableCount} tablo bulundu.`);
      } else {
        alert("❌ Bağlantı başarısız. Bilgileri kontrol edin.");
      }
      const updated = await fetch("/api/connections").then((r) => r.json());
      setConnections(updated);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090F",
      fontFamily: "monospace",
      color: "#E8EDF5",
      padding: 40,
    }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>ERP Bağlantıları</h1>

      {/* Form */}
      <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 24, maxWidth: 500, marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16, color: "#00E5FF" }}>Yeni Bağlantı Ekle</h2>
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
              <label style={{ color: "#3A4558", fontSize: 11, display: "block", marginBottom: 4 }}>{label.toUpperCase()}</label>
              {type === "select" ? (
                <select
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", background: "#07090F", border: "1px solid #131A26", borderRadius: 6, padding: "8px 12px", color: "#E8EDF5", fontSize: 12, fontFamily: "monospace" }}
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
                  style={{ width: "100%", background: "#07090F", border: "1px solid #131A26", borderRadius: 6, padding: "8px 12px", color: "#E8EDF5", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }}
                  required
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 8, width: "100%", background: "#00E5FF18", border: "1px solid #00E5FF40", borderRadius: 6, padding: "10px", color: "#00E5FF", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
          >
            {loading ? "Bağlanıyor..." : "Bağlantı Ekle →"}
          </button>
        </form>
      </div>

      {/* Connections List */}
      {connections.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, marginBottom: 12, color: "#3A4558" }}>Mevcut Bağlantılar</h2>
          {connections.map((conn: any) => (
            <div key={conn.id} style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 8, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{conn.dbName}</div>
                <div style={{ fontSize: 11, color: "#3A4558" }}>{conn.host} · {conn.erpType}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: conn.status === "active" ? "#69FF4720" : "#FF6B6B20", color: conn.status === "active" ? "#69FF47" : "#FF6B6B" }}>
                {conn.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}