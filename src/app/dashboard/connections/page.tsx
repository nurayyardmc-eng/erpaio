"use client";
import { useState, useEffect } from "react";
import { Database, Server, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { showToast } from "@/components/Toaster";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { colors } from "@/lib/theme";

interface Connection {
  id: string;
  erpType: string;
  host: string;
  dbName: string;
  status: string;
  lastSync?: string;
  createdAt: string;
}

const ERP_TYPES = [
  { id: "nebim_v3", label: "Nebim V3", desc: "Türkiye perakende standardı (MS SQL)", port: 1433 },
  { id: "sap", label: "SAP", desc: "S/4HANA, ECC (MS SQL veya Oracle)", port: 1433 },
  { id: "dynamics365", label: "Dynamics 365", desc: "Microsoft ERP (MS SQL)", port: 1433 },
  { id: "postgres", label: "PostgreSQL", desc: "Odoo, ERPNext, custom (PG)", port: 5432 },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    erpType: "nebim_v3",
    host: "",
    port: 1433,
    dbName: "",
    username: "",
    password: "",
  });

  const refresh = () => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => { setConnections(d); setListLoading(false); });
  };

  useEffect(() => { refresh(); }, []);

  const onTypeChange = (id: string) => {
    const t = ERP_TYPES.find((x) => x.id === id);
    setForm({ ...form, erpType: id, port: t?.port ?? 1433 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        showToast(data.error || "Bağlantı eklenemedi", "error");
        return;
      }
      showToast("Bağlantı eklendi, test ediliyor…", "info");
      const test = await fetch(`/api/connections/${data.id}/test`);
      const testData = await test.json();
      if (testData.ok) {
        showToast(`Bağlantı başarılı! ${testData.tableCount} tablo bulundu.`, "success");
        setForm({ erpType: "nebim_v3", host: "", port: 1433, dbName: "", username: "", password: "" });
        setShowForm(false);
      } else {
        showToast("Bağlantı başarısız. Bilgileri kontrol edin.", "error");
      }
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ağ hatası", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 400,
            letterSpacing: -1,
            margin: "0 0 8px",
          }}>
            ERP Bağlantıları
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            ERP veritabanlarınıza read-only bağlantı kurun. Şifreler AES-256-GCM ile şifrelenir.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: colors.text,
              color: colors.bg,
              padding: "10px 20px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Yeni Bağlantı
          </button>
        )}
      </div>

      {showForm && (
        <div className="elevated" style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 28,
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>Yeni Bağlantı</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 20px" }}>
            Önce ERP tipinizi seçin, sonra bağlantı bilgilerini girin.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
              marginBottom: 20,
            }}>
              {ERP_TYPES.map((t) => {
                const active = form.erpType === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => onTypeChange(t.id)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: active ? colors.brandSoft : colors.bg,
                      border: `1px solid ${active ? colors.text : colors.border}`,
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Database size={14} color={active ? colors.text : colors.textMuted} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 12 }}>
              <Field label="Host / IP">
                <input
                  required
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="db.firma.com"
                  style={inputStyle}
                />
              </Field>
              <Field label="Port">
                <input
                  type="number"
                  required
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Veritabanı Adı">
              <input
                required
                value={form.dbName}
                onChange={(e) => setForm({ ...form, dbName: e.target.value })}
                placeholder="NebimDB"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Kullanıcı Adı">
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="erpaio_readonly"
                  style={inputStyle}
                />
              </Field>
              <Field label="Şifre">
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: colors.bgSubtle,
              borderRadius: 8,
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 16,
              marginBottom: 16,
            }}>
              <ShieldCheck size={14} color={colors.brand} />
              <span>Şifre AES-256-GCM ile şifrelenir. Sadece SELECT yetkisi olan kullanıcı önerilir.</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: colors.text,
                  color: colors.bg,
                  border: "none",
                  borderRadius: 100,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Bağlanıyor…" : "Bağlantıyı Test Et ve Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: "transparent",
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 100,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {listLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={68} />)}
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={<Server size={28} />}
          title="Henüz bağlantı yok"
          description="Yukarıdaki butonla ilk ERP bağlantınızı ekleyin. Şema 30 saniyede taranır."
        />
      ) : (
        <div>
          <div style={{
            color: colors.textSubtle,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Mevcut Bağlantılar ({connections.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {connections.map((conn) => {
              const isActive = conn.status === "active";
              return (
                <div key={conn.id} className="elevated" style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      background: colors.brandSoft,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Database size={16} color={colors.brand} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{conn.dbName}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>
                        {conn.host} · {conn.erpType}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 100,
                    background: isActive ? "#D1FAE5" : "#FEE2E2",
                    color: isActive ? "#10B981" : "#EF4444",
                    fontWeight: 600,
                  }}>
                    {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {isActive ? "Aktif" : conn.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: "block",
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: 500,
        marginBottom: 4,
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: colors.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
