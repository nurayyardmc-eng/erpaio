"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
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
    <header className="dashboard-header" style={{
      background: "rgba(250,250,248,0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 56,
      gap: 12,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
        <Link
          href="/"
          aria-label="Ana sayfa"
          onClick={(e) => {
            // Mobilde amblem = menü tetikleyici (navigation yerine sidebar aç)
            if (typeof window !== "undefined" && window.innerWidth <= 900) {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("erpaio-open-sidebar"));
            }
          }}
          style={{ display: "flex", alignItems: "center", flexShrink: 0, cursor: "pointer" }}
        >
          <Logo size={36} variant="mark" />
        </Link>
        <div className="hide-mobile" style={{ width: 1, height: 24, background: "rgba(10,10,10,0.08)" }} />
        <div style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 20,
          fontWeight: 400,
          color: colors.text,
          letterSpacing: -0.5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          aria-label="Komut paleti aç"
          className="hide-mobile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 12px",
            border: `1px solid ${colors.border}`,
            background: colors.bg,
            borderRadius: 10,
            color: colors.textMuted,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <Search size={14} />
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Ara
            <kbd style={{
              fontSize: 10,
              border: `1px solid ${colors.border}`,
              padding: "1px 5px",
              borderRadius: 4,
              fontFamily: "ui-monospace, Menlo, Monaco, monospace",
              color: colors.textSubtle,
            }}>
              ⌘K
            </kbd>
          </span>
        </button>
        <NotificationBell />
        <UserMenu email={email} name={name} />
      </div>
    </header>
  );
}
