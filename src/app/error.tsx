"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{
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
      <div style={{ color: "#EF4444", fontSize: 10, letterSpacing: 3 }}>HATA</div>
      <h1 style={{ fontSize: 22, margin: 0 }}>Bir şeyler ters gitti</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", maxWidth: 480 }}>
        Beklenmedik bir hata oluştu. Sentry'ye iletildi, geliştirme ekibi inceleyecek.
      </p>
      {error.digest && (
        <code style={{ color: "#94A3B8", fontSize: 10, background: "#FFFFFF", padding: "4px 10px", borderRadius: 4 }}>
          ID: {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        style={{
          background: "#0A0A0A18",
          border: "1px solid #0A0A0A40",
          borderRadius: 6,
          padding: "10px 20px",
          color: "#0A0A0A",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Tekrar dene
      </button>
    </div>
  );
}
