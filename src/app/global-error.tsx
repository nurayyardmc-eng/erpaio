"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
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
        <div style={{ color: "#EF4444", fontSize: 10, letterSpacing: 3 }}>KRİTİK HATA</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Uygulama yüklenemedi</h1>
        <p style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", maxWidth: 480 }}>
          Sayfayı yenilemeyi deneyin.
        </p>
      </body>
    </html>
  );
}
