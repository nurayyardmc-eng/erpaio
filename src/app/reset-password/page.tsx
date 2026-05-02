"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#3A4558", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) setError("Geçersiz link.");
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
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 16 }}>
      <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 40, width: 400 }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#E8EDF5", fontSize: 20, margin: "0 0 24px" }}>Yeni Şifre</h1>

        {ok ? (
          <p style={{ color: "#69FF47", fontSize: 13 }}>✓ Şifre değiştirildi. Login&apos;e yönlendiriliyorsun...</p>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#3A4558", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4 }}>YENİ ŞİFRE (8+ karakter)</label>
              <input
                required type="password" minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#3A4558", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4 }}>TEKRAR</label>
              <input
                required type="password" minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={inputStyle}
              />
            </div>
            {error && <div style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading || !token}
              style={{
                width: "100%", background: "#00E5FF18", border: "1px solid #00E5FF40", borderRadius: 6,
                padding: 12, color: "#00E5FF", fontSize: 13, cursor: "pointer", fontFamily: "monospace",
              }}
            >
              {loading ? "Kaydediliyor..." : "Şifreyi Değiştir"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#07090F", border: "1px solid #131A26", borderRadius: 6,
  padding: "10px 12px", color: "#E8EDF5", fontSize: 13, fontFamily: "monospace",
  boxSizing: "border-box", outline: "none",
};
