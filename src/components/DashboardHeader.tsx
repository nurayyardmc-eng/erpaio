"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

const TITLES: Record<string, string> = {
  "/dashboard/chat": "Sohbet",
  "/dashboard/overview": "Anlık Metrikler",
  "/dashboard/saved": "Kayıtlı Sorgular",
  "/dashboard/alerts": "Bildirimler",
  "/dashboard/connections": "ERP Bağlantıları",
  "/dashboard/annotations": "Şema Açıklamaları",
  "/dashboard/watchlists": "Watchlists",
  "/dashboard/insights": "Şema Analizi",
  "/dashboard/scheduled-reports": "Planlı Raporlar",
  "/dashboard/audit": "Aktivite Logu",
  "/dashboard/team": "Takım",
  "/dashboard/security": "Güvenlik",
  "/dashboard/settings": "Ayarlar",
};

interface Props {
  email: string;
  name?: string | null;
}

export default function DashboardHeader({ email, name }: Props) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <header style={{
      background: "rgba(250,250,248,0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${colors.border}`,
      padding: "12px 24px",
      paddingLeft: "max(24px, calc(env(safe-area-inset-left) + 60px))",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 56,
      gap: 12,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/" aria-label="Ana sayfa" style={{ display: "flex", alignItems: "center" }}>
          <Logo size={36} />
        </Link>
        <div style={{ width: 1, height: 24, background: "rgba(10,10,10,0.08)" }} />
        <div style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 20,
          fontWeight: 400,
          color: colors.text,
          letterSpacing: -0.5,
        }}>
          {title}
        </div>
      </div>
      <UserMenu email={email} name={name} />
    </header>
  );
}
