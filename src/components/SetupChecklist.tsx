"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import { colors } from "@/lib/theme";
import { safeLocalGet, safeLocalSet } from "@/lib/storage/safeLocalStorage";

interface SetupStep {
  key: string;
  label: string;
  done: boolean;
  href: string;
  priority: number;
}

interface SetupScore {
  percent: number;
  doneCount: number;
  totalCount: number;
  nextStep: SetupStep | null;
  steps: SetupStep[];
}

const DISMISS_KEY = "erpaio_setup_checklist_dismissed";

/**
 * Setup checklist widget — kullanıcının onboarding tamamlık skorunu
 * dashboard'da gösterir. 100% olunca otomatik gizlenir; manuel dismiss
 * de localStorage'a kaydedilir.
 *
 * Track MMMMMMM.
 */
export default function SetupChecklist() {
  const [score, setScore] = useState<SetupScore | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => safeLocalGet(DISMISS_KEY) === "1");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    fetch("/api/tenant/setup-score")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SetupScore | null) => setScore(d))
      .catch(() => {});
  }, [dismissed]);

  if (dismissed || !score || score.percent === 100) return null;

  const dismiss = () => {
    setDismissed(true);
    safeLocalSet(DISMISS_KEY, "1");
  };

  return (
    <div style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 18,
      marginBottom: 24,
      position: "relative",
    }}>
      <button
        onClick={dismiss}
        aria-label="Kapat"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "transparent",
          border: "none",
          color: colors.textSubtle,
          cursor: "pointer",
          padding: 4,
          display: "flex",
        }}
      >
        <X size={14} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: colors.textMuted, marginBottom: 4, fontWeight: 600 }}>
            KURULUM · {score.doneCount}/{score.totalCount} adım
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>
            ERPAIO&apos;yu tam kurmak için kaldı: {score.totalCount - score.doneCount} adım
          </div>
        </div>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          color: colors.text,
          minWidth: 60,
          textAlign: "right",
        }}>
          %{score.percent}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        background: colors.bgSubtle,
        borderRadius: 100,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <div style={{
          width: `${score.percent}%`,
          height: "100%",
          background: colors.brand,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Next step pill */}
      {score.nextStep && !expanded && (
        <Link
          href={score.nextStep.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: colors.brand,
            color: colors.textInverse,
            padding: "8px 14px",
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Sıradaki: {score.nextStep.label} <ArrowRight size={14} />
        </Link>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          marginLeft: score.nextStep ? 8 : 0,
          background: "transparent",
          border: `1px solid ${colors.border}`,
          color: colors.textMuted,
          padding: "8px 12px",
          borderRadius: 100,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {expanded ? "Gizle" : "Tüm adımlar"}
      </button>

      {expanded && (
        <ul style={{
          listStyle: "none",
          padding: 0,
          margin: "16px 0 0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {score.steps.map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: s.done ? colors.successSoft : colors.bgSubtle,
                  color: s.done ? colors.success : colors.text,
                  textDecoration: "none",
                  fontSize: 13,
                  border: `1px solid ${s.done ? colors.success + "30" : "transparent"}`,
                }}
              >
                {s.done ? <CheckCircle2 size={16} /> : <Circle size={16} color={colors.textSubtle} />}
                <span style={{ flex: 1, textDecoration: s.done ? "line-through" : "none" }}>
                  {s.label}
                </span>
                {!s.done && <ArrowRight size={12} color={colors.textSubtle} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
