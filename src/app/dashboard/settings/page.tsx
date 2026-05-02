"use client";
import { useEffect, useState } from "react";

interface TenantSettings {
  id: string;
  name: string;
  plan: string;
  whatsappTo: string | null;
  whatsappEnabled: boolean;
  emailTo: string | null;
  emailEnabled: boolean;
  alertMinSeverity: "low" | "medium" | "high" | "critical";
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/tenant").then(async (r) => {
      if (r.ok) setTenant(await r.json());
    });
  }, []);

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenant.name,
          whatsappTo: tenant.whatsappTo || null,
          whatsappEnabled: tenant.whatsappEnabled,
          emailTo: tenant.emailTo || null,
          emailEnabled: tenant.emailEnabled,
          alertMinSeverity: tenant.alertMinSeverity,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ kind: "ok", msg: "Kaydedildi." });
      } else {
        setStatus({ kind: "err", msg: data.error || "Kayıt başarısız." });
      }
    } catch {
      setStatus({ kind: "err", msg: "Ağ hatası." });
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) {
    return (
      <div style={{ minHeight: "100vh", background: "#07090F", color: "#3A4558", padding: 40, fontFamily: "monospace" }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: "monospace", color: "#E8EDF5", padding: 40 }}>
      <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Ayarlar</h1>

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Tenant info */}
        <section style={card}>
          <h2 style={sectionTitle}>Hesap</h2>
          <Field label="Tenant Adı">
            <input
              value={tenant.name}
              onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
              style={input}
            />
          </Field>
          <Field label="Plan">
            <div style={{ ...input, color: "#9C8AFF", textTransform: "uppercase", letterSpacing: 1 }}>{tenant.plan}</div>
          </Field>
        </section>

        {/* WhatsApp */}
        <section style={card}>
          <h2 style={sectionTitle}>WhatsApp Bildirimleri</h2>
          <Toggle
            label="WhatsApp etkin"
            checked={tenant.whatsappEnabled}
            onChange={(v) => setTenant({ ...tenant, whatsappEnabled: v })}
          />
          <Field label="Alıcı (whatsapp:+90...)">
            <input
              value={tenant.whatsappTo ?? ""}
              onChange={(e) => setTenant({ ...tenant, whatsappTo: e.target.value })}
              placeholder="whatsapp:+905555555555"
              style={input}
              disabled={!tenant.whatsappEnabled}
            />
          </Field>
        </section>

        {/* Email */}
        <section style={card}>
          <h2 style={sectionTitle}>Email Bildirimleri (yakında)</h2>
          <Toggle
            label="Email etkin"
            checked={tenant.emailEnabled}
            onChange={(v) => setTenant({ ...tenant, emailEnabled: v })}
          />
          <Field label="Alıcı email">
            <input
              type="email"
              value={tenant.emailTo ?? ""}
              onChange={(e) => setTenant({ ...tenant, emailTo: e.target.value })}
              placeholder="alerts@firma.com"
              style={input}
              disabled={!tenant.emailEnabled}
            />
          </Field>
        </section>

        {/* Alert threshold */}
        <section style={card}>
          <h2 style={sectionTitle}>Alert Eşiği</h2>
          <Field label="Minimum severity">
            <select
              value={tenant.alertMinSeverity}
              onChange={(e) => setTenant({ ...tenant, alertMinSeverity: e.target.value as TenantSettings["alertMinSeverity"] })}
              style={input}
            >
              <option value="low">low (her şey gönderilir)</option>
              <option value="medium">medium</option>
              <option value="high">high (önerilen)</option>
              <option value="critical">critical (sadece kritik)</option>
            </select>
          </Field>
        </section>

        {/* Save */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ background: "#00E5FF18", border: "1px solid #00E5FF40", borderRadius: 6, padding: "10px 24px", color: "#00E5FF", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {status && (
            <span style={{ color: status.kind === "ok" ? "#69FF47" : "#FF6B6B", fontSize: 11 }}>
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#0C1018",
  border: "1px solid #131A26",
  borderRadius: 10,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  color: "#00E5FF",
  margin: 0,
  marginBottom: 4,
};

const input: React.CSSProperties = {
  width: "100%",
  background: "#07090F",
  border: "1px solid #131A26",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#E8EDF5",
  fontSize: 12,
  fontFamily: "monospace",
  boxSizing: "border-box",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: "#3A4558", fontSize: 10, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 12 }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "#00E5FF40" : "#131A26",
          border: `1px solid ${checked ? "#00E5FF" : "#1E2A3E"}`,
          position: "relative",
          transition: "all 0.15s",
        }}
      >
        <span style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: checked ? "#00E5FF" : "#3A4558",
          transition: "all 0.15s",
        }} />
      </span>
      <span>{label}</span>
    </label>
  );
}
