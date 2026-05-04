import { AlertCircle } from "lucide-react";
import { colors } from "@/lib/theme";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
      gap: 12,
      background: "rgba(239, 68, 68, 0.04)",
      border: "1px solid rgba(239, 68, 68, 0.15)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 48,
        height: 48,
        background: "rgba(239, 68, 68, 0.08)",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#EF4444",
      }}>
        <AlertCircle size={22} />
      </div>
      <div style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: 18,
        fontWeight: 400,
        letterSpacing: -0.3,
        color: colors.text,
      }}>
        Veri yüklenemedi
      </div>
      <p style={{
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 1.6,
        maxWidth: 360,
        margin: 0,
      }}>
        {message ?? "Bağlantı sorunu olabilir. Lütfen tekrar deneyin."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            padding: "8px 18px",
            borderRadius: 100,
            background: colors.text,
            color: colors.bg,
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
