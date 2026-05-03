"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

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
  const [stack, setStack] = useState<ConfirmOpts[]>([]);

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

  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];

  return (
    <div
      onClick={() => close(top.id, false)}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
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
            background: "#FEE2E2",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
        )}
        <h3 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: "#0A0A0A",
          margin: "0 0 8px",
          letterSpacing: -0.5,
        }}>
          {top.title}
        </h3>
        <p style={{ color: "#525252", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          {top.message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => close(top.id, false)}
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              background: "transparent",
              border: "1px solid rgba(10,10,10,0.12)",
              color: "#0A0A0A",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {top.cancelLabel ?? "İptal"}
          </button>
          <button
            onClick={() => close(top.id, true)}
            autoFocus
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              background: top.destructive ? "#EF4444" : "#0A0A0A",
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {top.confirmLabel ?? "Onayla"}
          </button>
        </div>
      </div>
    </div>
  );
}
