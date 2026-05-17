"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

type Step = "credentials" | "mfa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const attemptLogin = async (totp?: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      totpCode: totp ?? "",
      redirect: false,
    });
    return result;
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await attemptLogin();
      if (result?.error) {
        // NextAuth v5: custom errors thrown in authorize() come back as `code` or
        // embedded in `error`. Match either.
        const errStr = result.error ?? "";
        const codeStr = result.code ?? "";
        if (codeStr === "MFA_REQUIRED" || /MFA_REQUIRED/i.test(errStr)) {
          setStep("mfa");
          setLoading(false);
          return;
        }
        if (codeStr === "ACCOUNT_LOCKED" || /ACCOUNT_LOCKED/i.test(errStr)) {
          setError("Hesap geçici olarak kilitlendi (15 dk).");
          setLoading(false);
          return;
        }
        setError("Email veya şifre hatalı.");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Giriş başarısız. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await attemptLogin(totpCode.trim());
      if (result?.error) {
        setError(useRecovery ? "Kurtarma kodu geçersiz veya kullanılmış." : "Doğrulama kodu yanlış.");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Doğrulama başarısız.");
      setLoading(false);
    }
  };

  const handleSubmit = step === "mfa" ? handleMfaSubmit : handleCredentialsSubmit;

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
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 8px", fontWeight: 700, letterSpacing: -0.5 }}>
          {step === "mfa" ? "İki Faktörlü Doğrulama" : "Giriş Yap"}
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 28 }}>
          {step === "mfa"
            ? useRecovery
              ? "Kurtarma kodunu gir (XXXX-XXXX)"
              : "Authenticator app'inden 6 haneli kodu gir"
            : "Hesabına devam et"}
        </p>

        <form onSubmit={handleSubmit}>
          {step === "credentials" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={iconStyle} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 42 }}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Şifre</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={iconStyle} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 42 }}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20, fontSize: 13, textAlign: "right" }}>
                <Link href="/forgot-password" style={{ color: colors.brand, fontWeight: 500 }}>
                  Şifremi unuttum
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{useRecovery ? "Kurtarma Kodu" : "Doğrulama Kodu"}</label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck size={16} style={iconStyle} />
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      setTotpCode(
                        useRecovery
                          ? v.replace(/[^A-Z2-9-]/g, "").slice(0, 9)
                          : v.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    placeholder={useRecovery ? "XXXX-XXXX" : "000000"}
                    style={{
                      ...inputStyle,
                      paddingLeft: 42,
                      fontFamily: "ui-monospace, Menlo, Monaco, monospace",
                      letterSpacing: useRecovery ? 2 : 4,
                      fontSize: 18,
                      textAlign: "center",
                    }}
                    autoComplete="one-time-code"
                    inputMode={useRecovery ? "text" : "numeric"}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20, fontSize: 13, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery(!useRecovery);
                    setTotpCode("");
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.brand,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "underline",
                    fontFamily: "inherit",
                  }}
                >
                  {useRecovery ? "Authenticator kodu kullan" : "Kurtarma kodu kullan"}
                </button>
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: colors.errorSoft,
              color: colors.error,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
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
            {loading
              ? step === "mfa"
                ? "Doğrulanıyor..."
                : "Giriş yapılıyor..."
              : step === "mfa"
              ? "Doğrula"
              : "Giriş Yap"}
          </button>

          {step === "mfa" && (
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setTotpCode("");
                setError("");
              }}
              style={{
                marginTop: 12,
                width: "100%",
                background: "transparent",
                border: "none",
                color: colors.textMuted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Email/şifreye geri dön
            </button>
          )}

          {step === "credentials" && (
            <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: colors.textMuted }}>
              Hesabın yok mu? <Link href="/signup" style={{ color: colors.brand, fontWeight: 600 }}>Kayıt Ol</Link>
            </div>
          )}
        </form>
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
  transition: "border-color 0.15s",
};

const iconStyle: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: colors.textMuted,
  pointerEvents: "none",
};
