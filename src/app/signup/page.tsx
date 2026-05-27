"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Building2, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";
import { postJson } from "@/lib/http/clientFetch";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", tenantName: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) {
      setError("Kullanım Koşulları ve KVKK aydınlatma metnini onaylamanız gerekiyor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await postJson("/api/auth/signup", {
        ...form,
        acceptedTerms,
        acceptedPrivacy,
        documentVer: "v1",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt başarısız.");
        setLoading(false);
        return;
      }
      router.push(`/login?email=${encodeURIComponent(form.email)}&signup=ok`);
    } catch {
      setError("Ağ hatası.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bgSubtle,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 40,
        width: 440,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo size={96} variant="full" />
        </div>
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 8px", fontWeight: 700, letterSpacing: -0.5 }}>
          Hesap Oluştur
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 28 }}>
          14 gün ücretsiz Pro deneme — kart bilgisi gerekmez.
        </p>

        <form onSubmit={submit}>
          <Field label="Şirket Adı" icon={<Building2 size={16} />}>
            <input
              required
              value={form.tenantName}
              onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
              placeholder="Acme Ltd."
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </Field>

          <Field label="Adın" icon={<User size={16} />}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ali Yılmaz"
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </Field>

          <Field label="Email" icon={<Mail size={16} />}>
            <input
              required type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </Field>

          <Field label="Şifre (min 8 karakter)" icon={<Lock size={16} />}>
            <input
              required type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </Field>

          {/* KVKK md. 5 + GDPR Art. 7 — explicit, separated consent */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, marginTop: 6 }}>
            <ConsentCheckbox
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
            >
              <Link href="/terms" target="_blank" style={{ color: colors.text, textDecoration: "underline" }}>
                Kullanım Koşulları
              </Link>
              &apos;nı okudum ve kabul ediyorum.
            </ConsentCheckbox>
            <ConsentCheckbox
              checked={acceptedPrivacy}
              onChange={setAcceptedPrivacy}
            >
              <Link href="/privacy" target="_blank" style={{ color: colors.text, textDecoration: "underline" }}>
                KVKK Aydınlatma Metni
              </Link>
              {" "}ve{" "}
              <Link href="/privacy" target="_blank" style={{ color: colors.text, textDecoration: "underline" }}>
                Gizlilik Politikası
              </Link>
              &apos;nı okudum, kişisel verilerimin işlenmesine açık rıza veriyorum.
            </ConsentCheckbox>
          </div>

          {error && (
            <div style={{
              background: colors.errorSoft,
              color: colors.error,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !acceptedTerms || !acceptedPrivacy}
            style={{
              width: "100%",
              background: colors.brand,
              border: "none",
              borderRadius: 10,
              padding: 12,
              color: colors.textInverse,
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
              opacity: loading || !acceptedTerms || !acceptedPrivacy ? 0.6 : 1,
              cursor: loading || !acceptedTerms || !acceptedPrivacy ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: colors.textMuted }}>
          Hesabın var mı? <Link href="/login" style={{ color: colors.brand, fontWeight: 600 }}>Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      fontSize: 12,
      lineHeight: 1.5,
      color: colors.textMuted,
      cursor: "pointer",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          marginTop: 2,
          width: 16,
          height: 16,
          accentColor: colors.brand,
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
      <span>{children}</span>
    </label>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block",
        fontSize: 13,
        fontWeight: 500,
        color: colors.text,
        marginBottom: 6,
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: colors.textMuted,
            display: "flex",
            pointerEvents: "none",
          }}>
            {icon}
          </span>
        )}
        {children}
      </div>
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
