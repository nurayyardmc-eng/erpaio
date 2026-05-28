"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";
import { postJson } from "@/lib/http/clientFetch";
import { useI18n } from "@/lib/i18n/context";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await postJson("/api/auth/forgot-password", { email }).catch(() => {});
    setSent(true);
    setLoading(false);
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
        width: 400,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo size={96} variant="full" />
        </div>
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 24px", fontWeight: 700, letterSpacing: -0.5 }}>
          {t.forgotPassword.title}
        </h1>

        {sent ? (
          <div>
            <div style={{
              background: colors.successSoft,
              color: colors.success,
              padding: "12px 14px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <CheckCircle2 size={16} />
              {t.forgotPassword.successTitle}
            </div>
            <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6 }}>
              {t.forgotPassword.successBody}
            </p>
            <Link href="/login" style={{
              display: "inline-block",
              marginTop: 24,
              color: colors.brand,
              fontSize: 14,
              fontWeight: 500,
            }}>
              {t.forgotPassword.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 24 }}>
              {t.forgotPassword.description}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t.forgotPassword.fieldEmail}</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: colors.textMuted, pointerEvents: "none" }} />
                <input
                  required type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 42 }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: colors.brand,
                border: "none",
                borderRadius: 10,
                padding: 12,
                color: colors.textInverse,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {loading ? t.forgotPassword.submitting : t.forgotPassword.submit}
            </button>
            <div style={{ marginTop: 20, textAlign: "center", fontSize: 13 }}>
              <Link href="/login" style={{ color: colors.textMuted }}>{t.forgotPassword.backToLogin}</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: colors.text,
  marginBottom: 6,
};

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
