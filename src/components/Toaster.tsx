"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

let counter = 0;

export function showToast(message: string, kind: Toast["kind"] = "success") {
  if (typeof window === "undefined") return;
  const id = ++counter;
  window.dispatchEvent(new CustomEvent("erpaio-toast", { detail: { id, kind, message } }));
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Toast>;
      setToasts((prev) => [...prev, ce.detail]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== ce.detail.id));
      }, 4000);
    };
    window.addEventListener("erpaio-toast", handler);
    return () => window.removeEventListener("erpaio-toast", handler);
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { t } = useI18n();
  // Local kind-specific palette using theme tokens. Local var renamed `palette`
  // to avoid shadowing imported `colors` from @/lib/theme.
  const palette = {
    success: { fg: colors.success, bg: colors.successSoft, Icon: CheckCircle2 },
    error: { fg: colors.error, bg: colors.errorSoft, Icon: AlertCircle },
    info: { fg: colors.brand, bg: colors.brandSoft, Icon: Info },
  }[toast.kind];
  const Icon = palette.Icon;

  return (
    <div style={{
      pointerEvents: "auto",
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderLeft: `3px solid ${palette.fg}`,
      borderRadius: 12,
      padding: "12px 16px",
      paddingRight: 36,
      minWidth: 280,
      maxWidth: 400,
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      position: "relative",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)",
      animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)",
      fontSize: 14,
      color: colors.text,
    }}>
      <div style={{ background: palette.bg, borderRadius: 8, padding: 6, display: "flex" }}>
        <Icon size={16} color={palette.fg} />
      </div>
      <div style={{ flex: 1, paddingTop: 4, lineHeight: 1.4 }}>{toast.message}</div>
      <button
        onClick={onClose}
        aria-label={t.toaster.closeAria}
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          background: "transparent",
          border: "none",
          padding: 4,
          color: colors.textSubtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
