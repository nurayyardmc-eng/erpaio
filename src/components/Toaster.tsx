"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

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
  const colors = {
    success: { fg: "#10B981", bg: "#D1FAE5", Icon: CheckCircle2 },
    error: { fg: "#EF4444", bg: "#FEE2E2", Icon: AlertCircle },
    info: { fg: "#0A0A0A", bg: "#F2F1EE", Icon: Info },
  }[toast.kind];
  const Icon = colors.Icon;

  return (
    <div style={{
      pointerEvents: "auto",
      background: "#FFFFFF",
      border: "1px solid rgba(10,10,10,0.08)",
      borderLeft: `3px solid ${colors.fg}`,
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
      color: "#0A0A0A",
    }}>
      <div style={{ background: colors.bg, borderRadius: 8, padding: 6, display: "flex" }}>
        <Icon size={16} color={colors.fg} />
      </div>
      <div style={{ flex: 1, paddingTop: 4, lineHeight: 1.4 }}>{toast.message}</div>
      <button
        onClick={onClose}
        aria-label="Kapat"
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          background: "transparent",
          border: "none",
          padding: 4,
          color: "#737373",
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
