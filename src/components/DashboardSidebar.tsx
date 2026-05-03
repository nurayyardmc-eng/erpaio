"use client";
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
} from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

const navItems = [
  { href: "/dashboard/chat", label: "Sohbet", Icon: MessageSquare },
  { href: "/dashboard/overview", label: "Metrikler", Icon: BarChart3 },
  { href: "/dashboard/connections", label: "Bağlantılar", Icon: Database },
  { href: "/dashboard/alerts", label: "Bildirimler", Icon: Bell },
  { href: "/dashboard/saved", label: "Kayıtlı", Icon: Bookmark },
  { href: "/dashboard/scheduled-reports", label: "Raporlar", Icon: Send },
  { href: "/dashboard/watchlists", label: "Watchlists", Icon: Eye },
  { href: "/dashboard/insights", label: "Analiz", Icon: TrendingUp },
  { href: "/dashboard/annotations", label: "Açıklamalar", Icon: FileText },
  { href: "/dashboard/audit", label: "Audit", Icon: ScrollText },
  { href: "/dashboard/team", label: "Takım", Icon: Users },
  { href: "/dashboard/security", label: "Güvenlik", Icon: Shield },
  { href: "/dashboard/settings", label: "Ayarlar", Icon: SettingsIcon },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 64,
      minWidth: 64,
      background: colors.bg,
      borderRight: `1px solid ${colors.border}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 0",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      <Link href="/" style={{ marginBottom: 16, padding: 4 }}>
        <Logo size={28} variant="mark" />
      </Link>

      <Link
        href="/dashboard/chat"
        title="Yeni Sohbet"
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", padding: "0 4px" }}>
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
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
    </aside>
  );
}
