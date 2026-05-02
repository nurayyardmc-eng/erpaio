"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", tenantName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 16 }}>
      <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 40, width: 400 }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#E8EDF5", fontSize: 20, margin: "0 0 8px" }}>Kayıt Ol</h1>
        <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 24 }}>14 gün ücretsiz Pro deneme — kart bilgisi gerekmez.</p>

        <form onSubmit={submit}>
          <Field label="ŞİRKET ADI">
            <input
              required
              value={form.tenantName}
              onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
              placeholder="Acme Ltd."
              style={inputStyle}
            />
          </Field>

          <Field label="ADIN">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ali Yılmaz"
              style={inputStyle}
            />
          </Field>

          <Field label="EMAIL">
            <input
              required type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <Field label="ŞİFRE (en az 8 karakter)">
            <input
              required type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
            />
          </Field>

          {error && <div style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#00E5FF18",
              border: "1px solid #00E5FF40",
              borderRadius: 6,
              padding: 12,
              color: "#00E5FF",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "monospace",
              marginTop: 8,
            }}
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol →"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#3A4558" }}>
          Hesabın var mı? <Link href="/login" style={{ color: "#00E5FF", textDecoration: "none" }}>Giriş Yap</Link>
        </div>
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 9, color: "#3A4558" }}>
          Devam ederek <Link href="/terms" style={{ color: "#3A4558" }}>Kullanım Koşulları</Link> ve{" "}
          <Link href="/privacy" style={{ color: "#3A4558" }}>Gizlilik Politikası</Link>&apos;nı kabul edersiniz.
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: "#3A4558", fontSize: 10, letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#07090F",
  border: "1px solid #131A26",
  borderRadius: 6,
  padding: "10px 12px",
  color: "#E8EDF5",
  fontSize: 13,
  fontFamily: "monospace",
  boxSizing: "border-box",
  outline: "none",
};
