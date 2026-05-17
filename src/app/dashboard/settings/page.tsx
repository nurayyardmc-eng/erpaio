"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import { showToast } from "@/components/Toaster";
import { confirmDialog } from "@/components/Confirm";
import { useI18n } from "@/lib/i18n/context";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/dictionary";
import { colors } from "@/lib/theme";

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
  const { locale, setLocale, t } = useI18n();
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdStatus, setPwdStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Profile (kişisel bilgi + avatar)
  const [profile, setProfile] = useState({ name: "", email: "", avatarBase64: null as string | null });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tenant").then(async (r) => {
      if (r.ok) setTenant(await r.json());
    });
    fetch("/api/me").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setProfile({
          name: d.user?.name ?? "",
          email: d.user?.email ?? "",
          avatarBase64: d.user?.avatarBase64 ?? null,
        });
      }
    });
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name || null,
          avatarBase64: profile.avatarBase64,
        }),
      });
      if (res.ok) {
        showToast("Profil güncellendi", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Hata", "error");
      }
    } catch {
      showToast("Ağ hatası", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      showToast("Dosya çok büyük (max 300KB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfile((p) => ({ ...p, avatarBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

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

  const changePassword = async () => {
    if (pwd.next !== pwd.confirm) {
      setPwdStatus({ kind: "err", msg: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (pwd.next.length < 8) {
      setPwdStatus({ kind: "err", msg: "Yeni şifre en az 8 karakter olmalı." });
      return;
    }
    setPwdSaving(true);
    setPwdStatus(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdStatus({ kind: "ok", msg: "Şifre güncellendi." });
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        setPwdStatus({ kind: "err", msg: data.error || "Hata." });
      }
    } catch {
      setPwdStatus({ kind: "err", msg: "Ağ hatası." });
    } finally {
      setPwdSaving(false);
    }
  };

  if (!tenant) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.textMuted, padding: 40 }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle }}>
      <header style={{
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/dashboard">
          <Logo size={28} variant="mark" />
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
        <Link href="/dashboard" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, margin: "0 0 32px", letterSpacing: -0.5 }}>
          Ayarlar
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title="Profilim">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                background: profile.avatarBase64 ? "transparent" : colors.brand,
                color: colors.textInverse,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
                flexShrink: 0,
                border: `1px solid ${colors.border}`,
              }}>
                {profile.avatarBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarBase64} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (profile.name || profile.email).slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <label style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 100,
                  fontSize: 13,
                  cursor: "pointer",
                  background: colors.bg,
                  color: colors.text,
                  fontWeight: 500,
                }}>
                  Avatar yükle
                  <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
                </label>
                {profile.avatarBase64 && (
                  <button
                    onClick={() => setProfile({ ...profile, avatarBase64: null })}
                    style={{ marginLeft: 8, padding: "8px 12px", background: "transparent", border: "none", color: colors.error, fontSize: 12, cursor: "pointer" }}
                  >
                    Kaldır
                  </button>
                )}
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>JPG/PNG, max 300KB</div>
              </div>
            </div>

            <Field label="İsim">
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Ali Yılmaz"
                style={inputStyle}
              />
            </Field>
            <Field label="Email">
              <div style={{ ...inputStyle, color: colors.textMuted, background: colors.bgSubtle }}>
                {profile.email}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                Email değiştirmek için <a href="mailto:support@erpaio.com" style={{ color: colors.text, textDecoration: "underline" }}>support@erpaio.com</a> ile iletişime geçin.
              </div>
            </Field>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={saveProfile}
                disabled={profileSaving}
                style={primaryBtn}
              >
                {profileSaving ? "Kaydediliyor..." : "Profilimi Kaydet"}
              </button>
            </div>
          </Section>

          <Section title="Şirket">
            <Field label="Tenant Adı">
              <input
                value={tenant.name}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Plan">
              <div style={{
                ...inputStyle,
                color: colors.brand,
                background: colors.brandSoft,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: 13,
              }}>
                {tenant.plan}
              </div>
            </Field>
          </Section>

          <Section title={t.settings.language}>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>
              {t.settings.languageHint}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    if (loc === locale) return;
                    setLocale(loc as Locale);
                    showToast(t.settings.languageSaved, "success");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 100,
                    background: loc === locale ? colors.brand : colors.bg,
                    color: loc === locale ? colors.textInverse : colors.text,
                    border: `1px solid ${loc === locale ? colors.brand : colors.border}`,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </Section>

          <Section title="WhatsApp Bildirimleri">
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
                style={inputStyle}
                disabled={!tenant.whatsappEnabled}
              />
            </Field>
          </Section>

          <Section title="Email Bildirimleri">
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
                style={inputStyle}
                disabled={!tenant.emailEnabled}
              />
            </Field>
          </Section>

          <Section title="Alert Eşiği">
            <Field label="Minimum severity">
              <select
                value={tenant.alertMinSeverity}
                onChange={(e) => setTenant({ ...tenant, alertMinSeverity: e.target.value as TenantSettings["alertMinSeverity"] })}
                style={inputStyle}
              >
                <option value="low">low (her şey gönderilir)</option>
                <option value="medium">medium</option>
                <option value="high">high (önerilen)</option>
                <option value="critical">critical (sadece kritik)</option>
              </select>
            </Field>
          </Section>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={save}
              disabled={saving}
              style={primaryBtn}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {status && (
              <span style={{
                color: status.kind === "ok" ? colors.success : colors.error,
                fontSize: 13,
                fontWeight: 500,
              }}>
                {status.msg}
              </span>
            )}
          </div>

          <Section title="Şifre Değiştir">
            <Field label="Mevcut Şifre">
              <input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Yeni Şifre (min 8 karakter)">
              <input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Yeni Şifre (tekrar)">
              <input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={changePassword}
                disabled={pwdSaving || !pwd.current || !pwd.next || !pwd.confirm}
                style={secondaryBtn}
              >
                {pwdSaving ? "Güncelleniyor..." : "Şifre Değiştir"}
              </button>
              {pwdStatus && (
                <span style={{
                  color: pwdStatus.kind === "ok" ? colors.success : colors.error,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {pwdStatus.msg}
                </span>
              )}
            </div>
          </Section>

          <Section title="Hesap Güvenliği">
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
              İki faktörlü doğrulama (MFA), güven listesi (IP allowlist) ve API token yönetimi ayrı sayfada.
            </p>
            <Link
              href="/dashboard/security"
              style={{
                display: "inline-block",
                padding: "10px 18px",
                borderRadius: 100,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Güvenlik ayarlarına git →
            </Link>
          </Section>

          <DangerZone />
        </div>
      </main>
    </div>
  );
}

function DangerZone() {
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    const ok = await confirmDialog({
      title: "Hesabı silmek üzeresiniz",
      message: "Bu işlem GERİ ALINAMAZ. Tüm veriler (kullanıcılar, sohbetler, bağlantılar, alertler) kalıcı olarak silinir. Devam ediyor musunuz?",
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/tenant/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Hesap silindi. Yönlendiriliyorsun…", "success");
        setTimeout(() => { window.location.href = "/"; }, 1500);
      } else {
        showToast(data.error || "Hata", "error");
      }
    } catch {
      showToast("Ağ hatası", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section style={{
      background: "#FFFFFF",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: "#FEE2E2",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AlertTriangle size={16} color="#EF4444" />
        </div>
        <h2 style={{ fontSize: 16, color: "#EF4444", margin: 0, fontWeight: 600 }}>Tehlikeli Bölge</h2>
      </div>

      <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Hesabımı silmek istiyorum. Bu işlem KVKK md. 7 silinme hakkı kapsamındadır.
        Tüm veriler kaskat (cascade) olarak kalıcı silinir.
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            color: "#EF4444",
            border: "1px solid #EF4444",
            borderRadius: 100,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Hesabı Sil
        </button>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 6 }}>Şifre</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 6 }}>
              Onaylamak için &quot;<strong>HESABIMI SİL</strong>&quot; yazın
            </div>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="HESABIMI SİL"
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "ui-monospace, Menlo, Monaco, monospace",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={deleteAccount}
              disabled={deleting || !password || confirmation !== "HESABIMI SİL"}
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 100,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {deleting ? "Siliniyor…" : "Hesabımı Kalıcı Sil"}
            </button>
            <button
              onClick={() => { setShowForm(false); setPassword(""); setConfirmation(""); }}
              style={{
                background: "transparent",
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 100,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <h2 style={{ fontSize: 16, color: colors.text, margin: 0, fontWeight: 600 }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        color: colors.text,
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: colors.text }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? colors.brand : colors.borderStrong,
          position: "relative",
          transition: "all 0.15s",
        }}
      >
        <span style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "all 0.15s",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.1)",
        }} />
      </span>
      <span>{label}</span>
    </label>
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
  boxSizing: "border-box",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  background: colors.brand,
  border: "none",
  borderRadius: 10,
  padding: "10px 24px",
  color: colors.textInverse,
  fontSize: 14,
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "10px 24px",
  color: colors.text,
  fontSize: 14,
  fontWeight: 600,
};
