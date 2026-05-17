"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function Loader() {
  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bgSubtle,
      color: colors.textMuted,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      Yükleniyor...
    </div>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // Sync error/invalid flag with URL token param; runs once on mount and again only if token changes.
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Geçersiz link.");
      setTokenInvalid(true);
    }
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hata.");
        // Backend mesajı "Link geçersiz veya süresi dolmuş." → token-invalid CTA
        if (typeof data.error === "string" && /geçersiz|süresi/i.test(data.error)) {
          setTokenInvalid(true);
        }
        setLoading(false);
        return;
      }
      setOk(true);
      setTimeout(() => router.push("/login"), 1500);
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
        width: 400,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo size={96} variant="full" />
        </div>
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 24px", fontWeight: 700, letterSpacing: -0.5 }}>
          Yeni Şifre
        </h1>

        {ok ? (
          <div style={{
            background: colors.successSoft,
            color: colors.success,
            padding: "12px 14px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <CheckCircle2 size={18} />
            Şifre değiştirildi. Yönlendiriliyorsun...
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Yeni Şifre (min 8 karakter)</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={iconStyle} />
                <input
                  required type="password" minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 42 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Tekrar</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={iconStyle} />
                <input
                  required type="password" minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 42 }}
                />
              </div>
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
            {tokenInvalid ? (
              <Link
                href="/forgot-password"
                style={{
                  display: "block",
                  width: "100%",
                  background: colors.brand,
                  border: "none",
                  borderRadius: 10,
                  padding: 12,
                  color: colors.textInverse,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  boxSizing: "border-box",
                }}
              >
                Yeni şifre sıfırlama linki iste →
              </Link>
            ) : (
              <button
                type="submit"
                disabled={loading || !token}
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
                {loading ? "Kaydediliyor..." : "Şifreyi Değiştir"}
              </button>
            )}
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

const iconStyle: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: colors.textMuted,
  pointerEvents: "none",
};
