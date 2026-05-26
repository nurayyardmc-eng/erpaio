"use client";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";

interface Props {
  email: string;
  name?: string | null;
}

export default function DashboardHeader({ email, name }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();

  const titles = useMemo<Record<string, string>>(() => ({
    "/dashboard/chat": t.header.titleChat,
    "/dashboard/overview": t.header.titleOverview,
    "/dashboard/saved": t.header.titleSaved,
    "/dashboard/alerts": t.header.titleAlerts,
    "/dashboard/connections": t.header.titleConnections,
    "/dashboard/annotations": t.header.titleAnnotations,
    "/dashboard/watchlists": t.header.titleWatchlists,
    "/dashboard/insights": t.header.titleInsights,
    "/dashboard/scheduled-reports": t.header.titleReports,
    "/dashboard/audit": t.header.titleAudit,
    "/dashboard/team": t.header.titleTeam,
    "/dashboard/security": t.header.titleSecurity,
    "/dashboard/settings": t.header.titleSettings,
  }), [t]);

  const title = titles[pathname] ?? t.header.titleDashboard;

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
          aria-label={t.header.homeLabel}
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
        <div className="hide-mobile" style={{ width: 1, height: 24, background: colors.border }} />
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
