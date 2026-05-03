"use client";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/UserMenu";
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
      background: colors.bg,
      borderBottom: `1px solid ${colors.border}`,
      padding: "12px 24px",
      paddingLeft: "max(24px, calc(env(safe-area-inset-left) + 60px))",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 56,
      gap: 12,
    }}>
      <div style={{
        fontSize: 15,
        fontWeight: 600,
        color: colors.text,
        letterSpacing: -0.2,
      }}>
        {title}
      </div>
      <UserMenu email={email} name={name} />
    </header>
  );
}
