"use client";
import { useState } from "react";
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
  Menu,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

// Sıra: günlük kullanım → kurulum → analiz → admin
const navItems = [
  // Günlük
  { href: "/dashboard/chat", label: "Sohbet", Icon: MessageSquare },
  { href: "/dashboard/overview", label: "Metrikler", Icon: BarChart3 },
  { href: "/dashboard/saved", label: "Kayıtlı", Icon: Bookmark },
  { href: "/dashboard/alerts", label: "Bildirimler", Icon: Bell },
  // Kurulum
  { href: "/dashboard/connections", label: "Bağlantılar", Icon: Database },
  { href: "/dashboard/annotations", label: "Açıklamalar", Icon: FileText },
  { href: "/dashboard/watchlists", label: "Watchlists", Icon: Eye },
  // Analiz
  { href: "/dashboard/insights", label: "Analiz", Icon: TrendingUp },
  { href: "/dashboard/scheduled-reports", label: "Raporlar", Icon: Send },
  { href: "/dashboard/audit", label: "Audit", Icon: ScrollText },
  // Admin
  { href: "/dashboard/team", label: "Takım", Icon: Users },
  { href: "/dashboard/security", label: "Güvenlik", Icon: Shield },
  { href: "/dashboard/settings", label: "Ayarlar", Icon: SettingsIcon },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <Link href="/" style={{ marginBottom: 16, padding: 4 }}>
        <Logo size={28} variant="mark" />
      </Link>

      <Link
        href="/dashboard/chat"
        title="Yeni Sohbet"
        onClick={() => setMobileOpen(false)}
        style={{
          width: 40,
          height: 40,
          background: colors.text,
          color: colors.bg,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Plus size={20} strokeWidth={2.5} />
      </Link>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", padding: "0 4px", width: "100%", alignItems: "center" }}>
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={() => setMobileOpen(false)}
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: active ? colors.bgSubtle : "transparent",
                color: active ? colors.text : colors.textMuted,
                position: "relative",
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
              {active && (
                <span style={{
                  position: "absolute",
                  left: -4,
                  top: 10,
                  bottom: 10,
                  width: 2,
                  borderRadius: 2,
                  background: colors.text,
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — top-left, fixed */}
      <button
        onClick={() => setMobileOpen(true)}
        className="show-mobile"
        aria-label="Menüyü aç"
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 50,
          width: 40,
          height: 40,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Menu size={18} color={colors.text} />
      </button>

      {/* Desktop sidebar — always visible */}
      <aside className="hide-mobile" style={{
        width: 64,
        minWidth: 64,
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}>
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
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

      {/* Mobile drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: mobileOpen ? 0 : -80,
          bottom: 0,
          width: 64,
          background: colors.bg,
          borderRight: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
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
            marginBottom: 8,
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
