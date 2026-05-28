"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 40,
      textAlign: "center",
    }}>
      <Logo size={36} variant="mark" />
      <div style={{
        width: 64,
        height: 64,
        background: colors.errorSoft,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
      }}>
        <AlertOctagon size={28} color={colors.error} />
      </div>
      <h1 style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: 28,
        fontWeight: 400,
        letterSpacing: -1,
        margin: 0,
        color: colors.text,
      }}>
        {t.errorPages.errorTitle}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 15, maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
        {t.errorPages.errorDescription}
      </p>
      {error.digest && (
        <code style={{
          color: colors.textMuted,
          fontSize: 12,
          background: colors.bgSubtle,
          padding: "6px 12px",
          borderRadius: 6,
          fontFamily: "ui-monospace, Menlo, Monaco, monospace",
        }}>
          {t.errorPages.errorIdLabel}: {error.digest}
        </code>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            background: colors.text,
            color: colors.bg,
            border: "none",
            padding: "12px 24px",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={16} /> {t.errorPages.retryBtn}
        </button>
        <Link href="/" style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.borderStrong}`,
          padding: "12px 24px",
          borderRadius: 100,
          fontSize: 14,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}>
          <Home size={16} /> {t.errorPages.homeBtn}
        </Link>
      </div>
    </div>
  );
}
