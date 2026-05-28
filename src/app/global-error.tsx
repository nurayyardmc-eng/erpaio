"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useMemo } from "react";

/**
 * Global error boundary — wraps <html>/<body>, runs OUTSIDE the
 * I18nProvider context tree. Reads the `erpaio_lang` cookie directly
 * to pick TR/EN copy.
 */
const COPY: Record<"tr" | "en", { badge: string; title: string; description: string }> = {
  tr: {
    badge: "KRİTİK HATA",
    title: "Uygulama yüklenemedi",
    description: "Sayfayı yenilemeyi deneyin.",
  },
  en: {
    badge: "CRITICAL ERROR",
    title: "App failed to load",
    description: "Try refreshing the page.",
  },
};

function readLocale(): "tr" | "en" {
  if (typeof document === "undefined") return "tr";
  const match = document.cookie.match(/(?:^|; )erpaio_lang=([^;]+)/);
  const val = match?.[1];
  return val === "en" ? "en" : "tr";
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = useMemo(() => COPY[readLocale()], []);

  return (
    <html lang={readLocale()}>
      <body style={{
        margin: 0,
        minHeight: "100vh",
        background: "#F9FAFB",
        color: "#0F172A",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
      }}>
        <div style={{ color: "#EF4444", fontSize: 10, letterSpacing: 3 }}>{t.badge}</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>{t.title}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", maxWidth: 480 }}>
          {t.description}
        </p>
      </body>
    </html>
  );
}
