"use client";
import { useEffect, useState } from "react";

const NPS_DISMISSED_KEY = "erpaio_nps_dismissed_until";
const NPS_SUBMITTED_KEY = "erpaio_nps_submitted";

export default function NpsPrompt() {
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
      background: "#FFFFFF",
      border: "1px solid #1A2B4740",
      borderRadius: 12,
      padding: 20,
      width: 320,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      fontFamily: "inherit",
      zIndex: 1000,
    }}>
      {submitted ? (
        <div style={{ color: "#10B981", fontSize: 13, textAlign: "center" }}>✓ Teşekkürler!</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#1A2B47", fontSize: 9, letterSpacing: 2 }}>HIZLI ANKET</div>
            <button onClick={dismiss} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14 }}>×</button>
          </div>
          <p style={{ color: "#0F172A", fontSize: 12, lineHeight: 1.5, margin: "0 0 12px" }}>
            ERPAIO'yu bir arkadaşına önerir misin? <strong>0-10 arası puan ver.</strong>
          </p>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                style={{
                  flex: 1,
                  minWidth: 22,
                  padding: "6px 0",
                  background: score === i ? "#1A2B47" : "#F9FAFB",
                  color: score === i ? "#F9FAFB" : "#475569",
                  border: `1px solid ${score === i ? "#1A2B47" : "#E5E7EB"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
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
              placeholder="Yorum (opsiyonel)"
              rows={2}
              style={{
                width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: 6, padding: 8, color: "#0F172A", fontSize: 11,
                fontFamily: "inherit", boxSizing: "border-box", outline: "none", resize: "none",
                marginBottom: 8,
              }}
            />
          )}
          <button
            onClick={submit}
            disabled={score === null}
            style={{
              width: "100%", background: "#1A2B4718", border: "1px solid #1A2B4740",
              borderRadius: 6, padding: 8, color: "#1A2B47", fontSize: 11,
              cursor: score === null ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: score === null ? 0.5 : 1,
            }}
          >
            Gönder
          </button>
        </>
      )}
    </div>
  );
}
