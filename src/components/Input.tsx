"use client";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { colors } from "@/lib/theme";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, icon, error, hint, style, id, ...rest },
  ref,
) {
  // Sprint C.2 — generate a stable id so <label htmlFor> and the input
  // are explicitly associated. Caller can still pass id={} to override.
  const reactId = useId();
  const inputId = id ?? `input-${reactId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label htmlFor={inputId} style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: colors.text,
          marginBottom: 6,
        }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            color: error ? colors.error : colors.textMuted,
            pointerEvents: "none",
          }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...rest}
          style={{
            width: "100%",
            background: colors.bg,
            border: `1px solid ${error ? colors.error : colors.border}`,
            borderRadius: 10,
            padding: icon ? "10px 14px 10px 42px" : "10px 14px",
            color: colors.text,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            ...style,
          }}
        />
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{ fontSize: 12, color: colors.error, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}
        >
          {error}
        </div>
      )}
      {!error && hint && (
        <div id={hintId} style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
});

export default Input;
