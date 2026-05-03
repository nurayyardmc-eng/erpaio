import { Wrench, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export const metadata = { title: "Bakım · ERPAIO" };

export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bgSubtle,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 40,
      textAlign: "center",
    }}>
      <Logo size={56} variant="stacked" />
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: colors.warningSoft,
        color: colors.warning,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 1,
      }}>
        <Wrench size={14} />
        BAKIM
      </div>
      <h1 style={{ fontSize: 32, margin: 0, fontWeight: 700, color: colors.text, letterSpacing: -0.5 }}>
        ERPAIO geçici olarak kapalı
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 15, maxWidth: 480, lineHeight: 1.7 }}>
        Sistemde planlı bakım yapıyoruz. En kısa sürede geri döneceğiz.<br />
        Acil durumlar: <a href="mailto:support@erpaio.com" style={{ color: colors.brand, fontWeight: 500 }}>support@erpaio.com</a>
      </p>
      <a href="/status" style={{
        marginTop: 8,
        background: colors.brand,
        color: colors.textInverse,
        padding: "12px 24px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}>
        Durum Sayfası <ArrowRight size={16} />
      </a>
    </div>
  );
}
