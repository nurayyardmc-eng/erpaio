"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Inner />
    </Suspense>
  );
}

function Loader() {
  return <div style={{ minHeight: "100vh", background: "#07090F", color: "#3A4558", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>Yükleniyor...</div>;
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

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 16 }}>
      <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 40, width: 420, textAlign: "center" }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ color: "#E8EDF5", fontSize: 20, margin: "0 0 16px" }}>Email Doğrulama</h1>
        <div style={{ fontSize: 32, marginBottom: 12 }}>
          {state === "verifying" ? "⏳" : state === "ok" ? "✅" : "❌"}
        </div>
        <p style={{ color: state === "ok" ? "#69FF47" : state === "err" ? "#FF6B6B" : "#9AA5B4", fontSize: 13 }}>{msg || "Kontrol ediliyor..."}</p>
        {state === "ok" && <p style={{ color: "#3A4558", fontSize: 11, marginTop: 12 }}>Yönlendiriliyorsun...</p>}
      </div>
    </div>
  );
}
