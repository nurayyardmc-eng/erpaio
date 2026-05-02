"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 16 }}>
      <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 40, width: 400 }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#E8EDF5", fontSize: 20, margin: "0 0 24px" }}>Şifremi Unuttum</h1>

        {sent ? (
          <div>
            <p style={{ color: "#69FF47", fontSize: 13, marginBottom: 12 }}>✓ Email gönderildi</p>
            <p style={{ color: "#9AA5B4", fontSize: 12, lineHeight: 1.6 }}>
              Eğer <strong>{email}</strong> sistemde kayıtlıysa, şifre sıfırlama linkini bu adrese gönderdik. Link 1 saat geçerli.
            </p>
            <Link href="/login" style={{ display: "inline-block", marginTop: 20, color: "#00E5FF", fontSize: 12, textDecoration: "none" }}>← Giriş&apos;e dön</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 16 }}>Email&apos;ini gir, sıfırlama linki yollayalım.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#3A4558", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4 }}>EMAIL</label>
              <input
                required type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%", background: "#07090F", border: "1px solid #131A26", borderRadius: 6,
                  padding: "10px 12px", color: "#E8EDF5", fontSize: 13, fontFamily: "monospace",
                  boxSizing: "border-box", outline: "none",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", background: "#00E5FF18", border: "1px solid #00E5FF40", borderRadius: 6,
                padding: 12, color: "#00E5FF", fontSize: 13, cursor: "pointer", fontFamily: "monospace",
              }}
            >
              {loading ? "Gönderiliyor..." : "Sıfırlama linki yolla"}
            </button>
            <div style={{ marginTop: 16, textAlign: "center", fontSize: 11 }}>
              <Link href="/login" style={{ color: "#3A4558", textDecoration: "none" }}>← Giriş</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
