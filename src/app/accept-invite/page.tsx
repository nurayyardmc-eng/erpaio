"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Loader />}>
      <Inner />
    </Suspense>
  );
}

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#94A3B8", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Yükleniyor...
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError("Davet linki geçersiz.");
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hata.");
        setLoading(false);
        return;
      }
      router.push(`/login?email=${encodeURIComponent(data.email)}&accepted=ok`);
    } catch {
      setError("Ağ hatası.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", padding: 16 }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 40, width: 420 }}>
        <div style={{ color: "#1A2B47", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#0F172A", fontSize: 20, margin: "0 0 12px" }}>Davet kabulü</h1>
        <p style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>
          Hesabını oluşturmak için bir şifre belirle.
        </p>

        <form onSubmit={submit}>
          <Field label="ADIN">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="ŞİFRE (8+ karakter)">
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="TEKRAR">
            <input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
          </Field>
          {error && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !token}
            style={{ width: "100%", background: "#1A2B4718", border: "1px solid #1A2B4740", borderRadius: 6, padding: 12, color: "#1A2B47", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Kayıt..." : "Kabul et ve giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: "#94A3B8", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6,
  padding: "10px 12px", color: "#0F172A", fontSize: 13, fontFamily: "inherit",
  boxSizing: "border-box", outline: "none",
};
