"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";

const CONSENT_KEY = "erpaio_cookie_consent";

export default function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(CONSENT_KEY);
    // One-time hydration from localStorage — must run after mount because localStorage isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      background: colors.card,
      borderTop: `1px solid ${colors.border}`,
      padding: "16px 20px",
      zIndex: 999,
      boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            {t.cookieConsent.message}{" "}
            <Link href="/privacy" style={{ color: colors.brand, fontWeight: 500 }}>
              {t.cookieConsent.privacyLink}
            </Link>
          </p>
        </div>
        <button
          onClick={accept}
          style={{
            background: colors.brand,
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            color: colors.textInverse,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {t.cookieConsent.accept}
        </button>
      </div>
    </div>
  );
}
