"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BarChart3,
  Database,
  Bell,
  Bookmark,
  ScrollText,
  Users,
  Shield,
  Settings as SettingsIcon,
  FileText,
  TrendingUp,
  Send,
  Eye,
  Plus,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";

interface NavItem { href: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; }

export default function DashboardSidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  const navGroups: { label: string; items: NavItem[] }[] = useMemo(() => [
    {
      label: t.sidebar.groupDaily,
      items: [
        { href: "/dashboard/chat", label: t.sidebar.navChat, Icon: MessageSquare },
        { href: "/dashboard/overview", label: t.sidebar.navOverview, Icon: BarChart3 },
        { href: "/dashboard/saved", label: t.sidebar.navSaved, Icon: Bookmark },
        { href: "/dashboard/alerts", label: t.sidebar.navAlerts, Icon: Bell },
      ],
    },
    {
      label: t.sidebar.groupSetup,
      items: [
        { href: "/dashboard/connections", label: t.sidebar.navConnections, Icon: Database },
        { href: "/dashboard/annotations", label: t.sidebar.navAnnotations, Icon: FileText },
        { href: "/dashboard/watchlists", label: t.sidebar.navWatchlists, Icon: Eye },
      ],
    },
    {
      label: t.sidebar.groupAnalysis,
      items: [
        { href: "/dashboard/insights", label: t.sidebar.navInsights, Icon: TrendingUp },
        { href: "/dashboard/scheduled-reports", label: t.sidebar.navReports, Icon: Send },
        { href: "/dashboard/audit", label: t.sidebar.navAudit, Icon: ScrollText },
      ],
    },
    {
      label: t.sidebar.groupAdmin,
      items: [
        { href: "/dashboard/team", label: t.sidebar.navTeam, Icon: Users },
        { href: "/dashboard/security", label: t.sidebar.navSecurity, Icon: Shield },
        { href: "/dashboard/settings", label: t.sidebar.navSettings, Icon: SettingsIcon },
      ],
    },
  ], [t]);

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("erpaio-open-sidebar", handler);
    return () => window.removeEventListener("erpaio-open-sidebar", handler);
  }, []);

  const sidebarContent = (
    <>
      <Link
        href="/dashboard/chat"
        title={t.sidebar.newChat}
        onClick={() => setMobileOpen(false)}
        onMouseEnter={() => setHoveredHref("__new__")}
        onMouseLeave={() => setHoveredHref(null)}
        style={{
          width: 40,
          height: 40,
          background: colors.text,
          color: colors.bg,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          position: "relative",
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
        {hoveredHref === "__new__" && <Tooltip>{t.sidebar.newChat}</Tooltip>}
      </Link>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", width: "100%", alignItems: "center" }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "center",
            paddingTop: gi === 0 ? 0 : 8,
            paddingBottom: gi === navGroups.length - 1 ? 0 : 8,
            borderTop: gi === 0 ? "none" : `1px solid ${colors.border}`,
            width: "calc(100% - 12px)",
          }}>
            {group.items.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  onMouseEnter={() => setHoveredHref(href)}
                  onMouseLeave={() => setHoveredHref(null)}
                  aria-label={label}
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: active
                      ? colors.bgSubtle
                      : hoveredHref === href ? colors.bgMuted : "transparent",
                    color: active ? colors.text : (hoveredHref === href ? colors.text : colors.textMuted),
                    position: "relative",
                    transition: "background 0.15s ease, color 0.15s ease",
                  }}
                >
                  <Icon size={17} strokeWidth={active ? 2 : 1.7} />
                  {active && (
                    <span style={{
                      position: "absolute",
                      left: -8,
                      top: 8,
                      bottom: 8,
                      width: 2,
                      borderRadius: 2,
                      background: colors.text,
                    }} />
                  )}
                  {hoveredHref === href && <Tooltip>{label}</Tooltip>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <aside className="hide-mobile" style={{
        width: 56,
        minWidth: 56,
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 0",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 99,
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: mobileOpen ? 0 : -80,
          bottom: 0,
          width: 56,
          background: colors.bg,
          borderRight: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 0",
          zIndex: 100,
          transition: "left 0.2s ease",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Kapat"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginBottom: 4,
            color: colors.textMuted,
          }}
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      position: "absolute",
      left: "calc(100% + 12px)",
      top: "50%",
      transform: "translateY(-50%)",
      background: colors.text,
      color: colors.bg,
      padding: "5px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 50,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }}>
      {children}
    </span>
  );
}
