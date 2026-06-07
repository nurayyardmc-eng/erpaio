"use client";
// Sprint P6 — dashboard segment error boundary.
//
// A route-segment error.tsx under /dashboard catches render/runtime
// errors in any dashboard page WITHOUT unmounting the dashboard layout
// (sidebar + header stay), unlike the global app/error.tsx which replaces
// the whole viewport. The user keeps their navigation and can retry in
// place. Errors are still reported to Sentry.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, LayoutDashboard } from "lucide-react";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

export default function DashboardError({
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
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: colors.errorSoft,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertOctagon size={26} color={colors.error} />
      </div>
      <h1
        style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: -0.5,
          margin: 0,
          color: colors.text,
        }}
      >
        {t.errorPages.errorTitle}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 14, maxWidth: 440, lineHeight: 1.6, margin: 0 }}>
        {t.errorPages.errorDescription}
      </p>
      {error.digest && (
        <code
          style={{
            color: colors.textMuted,
            fontSize: 12,
            background: colors.bgSubtle,
            padding: "6px 12px",
            borderRadius: 6,
            fontFamily: "ui-monospace, Menlo, Monaco, monospace",
          }}
        >
          {t.errorPages.errorIdLabel}: {error.digest}
        </code>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            background: colors.text,
            color: colors.bg,
            border: "none",
            padding: "10px 22px",
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
        <Link
          href="/dashboard/overview"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.borderStrong}`,
            padding: "10px 22px",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LayoutDashboard size={16} /> {t.errorPages.dashboardBtn}
        </Link>
      </div>
    </div>
  );
}
