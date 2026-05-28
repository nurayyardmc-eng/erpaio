"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postJson } from "@/lib/http/clientFetch";
import { useI18n } from "@/lib/i18n/context";

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
      ...
    </div>
  );
}

function Inner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // One-shot validation when token changes; intended to sync error state with URL param.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) setError(t.acceptInvite.errInvalidLink);
  }, [token, t.acceptInvite.errInvalidLink]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.acceptInvite.errMismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await postJson("/api/team/accept-invite", { token, password, name: name || undefined });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.acceptInvite.errGeneric);
        setLoading(false);
        return;
      }
      router.push(`/login?email=${encodeURIComponent(data.email)}&accepted=ok`);
    } catch {
      setError(t.acceptInvite.errNetwork);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", padding: 16 }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 40, width: 420 }}>
        <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.acceptInvite.brand}</div>
        <h1 style={{ color: "#0F172A", fontSize: 20, margin: "0 0 12px" }}>{t.acceptInvite.title}</h1>
        <p style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>
          {t.acceptInvite.description}
        </p>

        <form onSubmit={submit}>
          <Field label={t.acceptInvite.fieldName}>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={t.acceptInvite.fieldPassword}>
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={t.acceptInvite.fieldConfirm}>
            <input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
          </Field>
          {error && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !token}
            style={{ width: "100%", background: "#0A0A0A18", border: "1px solid #0A0A0A40", borderRadius: 6, padding: 12, color: "#0A0A0A", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            {loading ? t.acceptInvite.submitting : t.acceptInvite.submit}
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
