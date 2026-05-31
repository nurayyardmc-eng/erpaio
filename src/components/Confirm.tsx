"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

interface ConfirmOpts {
  id: number;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

let counter = 0;

export function confirmDialog(opts: Omit<ConfirmOpts, "id" | "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const id = ++counter;
    window.dispatchEvent(
      new CustomEvent("erpaio-confirm", { detail: { id, ...opts, resolve } }),
    );
  });
}

export default function ConfirmHost() {
  const { t } = useI18n();
  const [stack, setStack] = useState<ConfirmOpts[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ConfirmOpts>;
      setStack((prev) => [...prev, ce.detail]);
    };
    window.addEventListener("erpaio-confirm", handler);
    return () => window.removeEventListener("erpaio-confirm", handler);
  }, []);

  const close = (id: number, ok: boolean) => {
    setStack((prev) => {
      const item = prev.find((x) => x.id === id);
      item?.resolve(ok);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Sprint C.1 — keyboard handling. Escape closes (counts as cancel).
  // Tab cycles focus inside the dialog so keyboard users can't escape
  // the modal without explicitly cancelling/confirming.
  useEffect(() => {
    if (stack.length === 0) return;
    const top = stack[stack.length - 1];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(top.id, false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.length]);

  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];

  return (
    <div
      onClick={() => close(top.id, false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`confirm-title-${top.id}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.card,
          borderRadius: 16,
          padding: 28,
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        {top.destructive && (
          <div style={{
            width: 44,
            height: 44,
            background: colors.errorSoft,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <AlertTriangle size={22} color={colors.error} />
          </div>
        )}
        <h3 id={`confirm-title-${top.id}`} style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: colors.text,
          margin: "0 0 8px",
          letterSpacing: -0.5,
        }}>
          {top.title}
        </h3>
        <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          {top.message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => close(top.id, false)}
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              background: "transparent",
              border: `1px solid ${colors.borderStrong}`,
              color: colors.text,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {top.cancelLabel ?? t.common.cancel}
          </button>
          <button
            onClick={() => close(top.id, true)}
            autoFocus
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              background: top.destructive ? colors.error : colors.brand,
              border: "none",
              color: colors.textInverse,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {top.confirmLabel ?? t.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
