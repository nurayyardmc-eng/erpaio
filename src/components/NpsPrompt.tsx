"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

const NPS_DISMISSED_KEY = "erpaio_nps_dismissed_until";
const NPS_SUBMITTED_KEY = "erpaio_nps_submitted";

export default function NpsPrompt() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const submittedAt = localStorage.getItem(NPS_SUBMITTED_KEY);
    if (submittedAt && Date.now() - Number(submittedAt) < 90 * 24 * 60 * 60_000) return;

    const dismissedUntil = localStorage.getItem(NPS_DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const t = setTimeout(() => setShow(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(NPS_DISMISSED_KEY, String(Date.now() + 14 * 24 * 60 * 60_000));
    }
  };

  const submit = async () => {
    if (score === null) return;
    await fetch("/api/nps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment: comment || undefined }),
    }).catch(() => {});
    if (typeof window !== "undefined") {
      localStorage.setItem(NPS_SUBMITTED_KEY, String(Date.now()));
    }
    setSubmitted(true);
    setTimeout(() => setShow(false), 2000);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      width: 320,
      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      zIndex: 1000,
    }}>
      {submitted ? (
        <div style={{
          color: colors.success,
          fontSize: 14,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
        }}>
          <CheckCircle2 size={18} />
          {t.nps.thanksMsg}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{
              color: colors.brand,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: 700,
              textTransform: "uppercase",
            }}>
              {t.nps.header}
            </div>
            <button onClick={dismiss} aria-label={t.nps.dismissAria} style={{
              background: "none",
              border: "none",
              color: colors.textSubtle,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ color: colors.text, fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
            {t.nps.promptText} <strong>{t.nps.ratingHint}</strong>
          </p>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                style={{
                  flex: 1,
                  minWidth: 24,
                  padding: "6px 0",
                  background: score === i ? colors.brand : colors.bg,
                  color: score === i ? colors.textInverse : colors.textMuted,
                  border: `1px solid ${score === i ? colors.brand : colors.border}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {i}
              </button>
            ))}
          </div>
          {score !== null && score >= 0 && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.nps.commentPlaceholder}
              rows={2}
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 10,
                color: colors.text,
                fontSize: 12,
                boxSizing: "border-box",
                outline: "none",
                resize: "none",
                marginBottom: 10,
              }}
            />
          )}
          <button
            onClick={submit}
            disabled={score === null}
            style={{
              width: "100%",
              background: colors.brand,
              border: "none",
              borderRadius: 8,
              padding: 10,
              color: colors.textInverse,
              fontSize: 13,
              fontWeight: 600,
              opacity: score === null ? 0.4 : 1,
            }}
          >
            {t.nps.submitBtn}
          </button>
        </>
      )}
    </div>
  );
}
