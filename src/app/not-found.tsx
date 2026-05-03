import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 40,
      textAlign: "center",
    }}>
      <Logo size={36} variant="mark" />
      <div style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: "clamp(80px, 16vw, 160px)",
        fontWeight: 400,
        letterSpacing: -4,
        lineHeight: 1,
        color: colors.text,
        margin: "12px 0",
      }}>
        404
      </div>
      <h1 style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: 28,
        fontWeight: 400,
        letterSpacing: -1,
        margin: 0,
        color: colors.text,
      }}>
        Sayfa bulunamadı
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 15, maxWidth: 420, lineHeight: 1.6, margin: 0 }}>
        Aradığınız sayfa taşınmış veya silinmiş olabilir.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" style={{
          background: colors.text,
          color: colors.bg,
          padding: "12px 24px",
          borderRadius: 100,
          fontSize: 14,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}>
          <Home size={16} /> Ana sayfa
        </Link>
        <Link href="/dashboard" style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.borderStrong}`,
          padding: "12px 24px",
          borderRadius: 100,
          fontSize: 14,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </div>
    </div>
  );
}
