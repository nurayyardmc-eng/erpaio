"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      background: "#07090F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "monospace",
    }}>
      <div style={{
        background: "#0C1018",
        border: "1px solid #131A26",
        borderRadius: 12,
        padding: 40,
        width: 360,
      }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#E8EDF5", fontSize: 20, margin: "0 0 24px" }}>Giriş Yap</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#3A4558", fontSize: 11, display: "block", marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "#07090F",
                border: "1px solid #131A26",
                borderRadius: 6,
                padding: "10px 12px",
                color: "#E8EDF5",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#3A4558", fontSize: 11, display: "block", marginBottom: 6 }}>ŞİFRE</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                background: "#07090F",
                border: "1px solid #131A26",
                borderRadius: 6,
                padding: "10px 12px",
                color: "#E8EDF5",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          {error && <div style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 16 }}>{error}</div>}

          <div style={{ marginBottom: 16, fontSize: 11, textAlign: "right" }}>
            <a href="/forgot-password" style={{ color: "#9AA5B4", textDecoration: "none" }}>Şifremi unuttum?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#00E5FF18",
              border: "1px solid #00E5FF40",
              borderRadius: 6,
              padding: "12px",
              color: "#00E5FF",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap →"}
          </button>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#3A4558" }}>
            Hesabın yok mu? <a href="/signup" style={{ color: "#00E5FF", textDecoration: "none" }}>Kayıt Ol</a>
          </div>
        </form>
      </div>
    </div>
  );
}
