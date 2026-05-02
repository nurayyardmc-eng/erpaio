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
      background: "#07090F",
      color: "#E8EDF5",
      fontFamily: "monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 40,
    }}>
      <div style={{ color: "#FF6B6B", fontSize: 10, letterSpacing: 3 }}>HATA</div>
      <h1 style={{ fontSize: 22, margin: 0 }}>Bir şeyler ters gitti</h1>
      <p style={{ color: "#3A4558", fontSize: 12, textAlign: "center", maxWidth: 480 }}>
        Beklenmedik bir hata oluştu. Sentry'ye iletildi, geliştirme ekibi inceleyecek.
      </p>
      {error.digest && (
        <code style={{ color: "#3A4558", fontSize: 10, background: "#0C1018", padding: "4px 10px", borderRadius: 4 }}>
          ID: {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        style={{
          background: "#00E5FF18",
          border: "1px solid #00E5FF40",
          borderRadius: 6,
          padding: "10px 20px",
          color: "#00E5FF",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "monospace",
        }}
      >
        Tekrar dene
      </button>
    </div>
  );
}
