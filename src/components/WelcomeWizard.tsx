"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, MessageSquare, Sparkles, X } from "lucide-react";
import { colors } from "@/lib/theme";
import { safeLocalGet, safeLocalSet } from "@/lib/storage/safeLocalStorage";
import { useI18n } from "@/lib/i18n/context";

/**
 * First-run welcome wizard (Feature 4.1).
 *
 * Renders a full-screen modal on the first dashboard visit for a brand-new
 * tenant whose setup score is 0% (no connections, no chats yet). Explains
 * the 3-step product flow and routes the user to /dashboard/connections.
 *
 * Dismissal persists in localStorage; never shows again once dismissed
 * (even if the tenant deletes their connection and returns to 0%).
 *
 * Locale-aware (TR/EN) via useI18n().
 */

const DISMISS_KEY = "erpaio_welcome_wizard_dismissed";

interface SetupScoreLite {
  percent: number;
  doneCount: number;
}

export default function WelcomeWizard() {
  const { t } = useI18n();
  const [score, setScore] = useState<SetupScoreLite | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => safeLocalGet(DISMISS_KEY) === "1");

  useEffect(() => {
    if (dismissed) return;
    fetch("/api/tenant/setup-score")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SetupScoreLite | null) => setScore(d))
      .catch(() => {});
  }, [dismissed]);

  if (dismissed || !score || score.doneCount > 0) return null;

  const dismiss = () => {
    setDismissed(true);
    safeLocalSet(DISMISS_KEY, "1");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.5)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: colors.card,
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          padding: 40,
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <button
          onClick={dismiss}
          aria-label={t.welcomeWizard.dismissAria}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: colors.textSubtle,
            cursor: "pointer",
            padding: 6,
            display: "flex",
          }}
        >
          <X size={18} />
        </button>

        <div style={{ fontSize: 11, letterSpacing: 3, color: colors.textMuted, fontWeight: 700, marginBottom: 12 }}>
          {t.welcomeWizard.brand}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 400,
            letterSpacing: -1,
            color: colors.text,
            margin: "0 0 12px",
            lineHeight: 1.2,
          }}
        >
          {t.welcomeWizard.title}
        </h2>
        <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 28px" }}>
          {t.welcomeWizard.subtitle}
        </p>

        <Step icon={<Database size={18} />} number="1" label={t.welcomeWizard.step1Label} desc={t.welcomeWizard.step1Desc} />
        <Step icon={<MessageSquare size={18} />} number="2" label={t.welcomeWizard.step2Label} desc={t.welcomeWizard.step2Desc} />
        <Step icon={<Sparkles size={18} />} number="3" label={t.welcomeWizard.step3Label} desc={t.welcomeWizard.step3Desc} />

        <Link
          href="/dashboard/connections"
          onClick={dismiss}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: colors.text,
            color: colors.bg,
            padding: "14px 28px",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            marginTop: 12,
          }}
        >
          {t.welcomeWizard.cta} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function Step({
  icon,
  number,
  label,
  desc,
}: {
  icon: React.ReactNode;
  number: string;
  label: string;
  desc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "12px 0",
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: colors.brandSoft,
          color: colors.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: colors.textSubtle, letterSpacing: 2, fontWeight: 700 }}>
            {number}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{label}</span>
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
