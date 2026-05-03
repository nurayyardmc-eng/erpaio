"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email veya şifre hatalı.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError("Giriş başarısız. Lütfen tekrar deneyin.");
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
        width: 400,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo size={48} variant="stacked" />
        </div>
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 8px", fontWeight: 700, letterSpacing: -0.5 }}>
          Giriş Yap
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 28 }}>
          Hesabına devam et
        </p>

        <form onSubmit={handleSubmit}>
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
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: colors.textMuted }}>
            Hesabın yok mu? <Link href="/signup" style={{ color: colors.brand, fontWeight: 600 }}>Kayıt Ol</Link>
          </div>
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
