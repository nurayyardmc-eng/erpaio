"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Inner />
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

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"verifying" | "ok" | "err">("verifying");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setMsg("Link geçersiz.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) {
          setState("ok");
          setMsg("Email doğrulandı.");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setState("err");
          setMsg(d.error || "Doğrulama başarısız.");
        }
      })
      .catch(() => {
        setState("err");
        setMsg("Ağ hatası.");
      });
  }, [token, router]);

  const stateColor = state === "ok" ? colors.success : state === "err" ? colors.error : colors.textMuted;

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
        width: 420,
        textAlign: "center",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      }}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <Logo size={32} />
        </div>
        <h1 style={{ color: colors.text, fontSize: 24, margin: "0 0 24px", fontWeight: 700, letterSpacing: -0.5 }}>
          Email Doğrulama
        </h1>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {state === "verifying" ? "⏳" : state === "ok" ? "✅" : "❌"}
        </div>
        <p style={{ color: stateColor, fontSize: 15, fontWeight: 500 }}>
          {msg || "Kontrol ediliyor..."}
        </p>
        {state === "ok" && (
          <p style={{ color: colors.textSubtle, fontSize: 13, marginTop: 16 }}>
            Yönlendiriliyorsun...
          </p>
        )}
      </div>
    </div>
  );
}
