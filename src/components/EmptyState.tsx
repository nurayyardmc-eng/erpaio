import type { ReactNode } from "react";
import { colors } from "@/lib/theme";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
      gap: 14,
    }}>
      {icon && (
        <div style={{
          width: 64,
          height: 64,
          background: colors.bgSubtle,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textMuted,
          marginBottom: 4,
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: 22,
        fontWeight: 400,
        letterSpacing: -0.5,
        color: colors.text,
        margin: 0,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 1.6,
          maxWidth: 380,
          margin: 0,
        }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
