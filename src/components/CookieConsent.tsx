"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "erpaio_cookie_consent";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(CONSENT_KEY);
    if (!v) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, at: Date.now() }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "#0C1018",
      borderTop: "1px solid #00E5FF40",
      padding: 16,
      fontFamily: "monospace",
      zIndex: 999,
      boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ color: "#00E5FF", fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>ÇEREZ KULLANIMI</div>
          <p style={{ color: "#9AA5B4", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Bu site oturum açma için strictly gerekli çerezler kullanır (NextAuth). Üçüncü taraf reklam çerezi yok.
            Detay: <Link href="/privacy" style={{ color: "#00E5FF" }}>Gizlilik Politikası</Link>.
          </p>
        </div>
        <button
          onClick={accept}
          style={{
            background: "#00E5FF18",
            border: "1px solid #00E5FF40",
            borderRadius: 6,
            padding: "8px 20px",
            color: "#00E5FF",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          Anladım
        </button>
      </div>
    </div>
  );
}
