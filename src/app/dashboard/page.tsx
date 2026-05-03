import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Database,
  MessageSquare,
  Bell,
  FileText,
  TrendingUp,
  Bookmark,
  Send,
  Eye,
  ScrollText,
  Users,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import NpsPrompt from "@/components/NpsPrompt";
import CookieConsent from "@/components/CookieConsent";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

const items = [
  { href: "/dashboard/overview", label: "Anlık Metrikler", desc: "Pre-computed dashboard", Icon: BarChart3 },
  { href: "/dashboard/connections", label: "ERP Bağlantıları", desc: "Nebim V3 bağlantısı yönet", Icon: Database },
  { href: "/dashboard/chat", label: "Soru Sor", desc: "Türkçe doğal dil sorgusu", Icon: MessageSquare },
  { href: "/dashboard/alerts", label: "Bildirimler", desc: "Anomali ve uyarılar", Icon: Bell },
  { href: "/dashboard/annotations", label: "Şema Açıklamaları", desc: "Tablo ve kolon notları", Icon: FileText },
  { href: "/dashboard/insights", label: "Şema Analizi", desc: "FK çıkarımı ve metrikler", Icon: TrendingUp },
  { href: "/dashboard/saved", label: "Kayıtlı Sorgular", desc: "Sık kullanılan sorgular", Icon: Bookmark },
  { href: "/dashboard/scheduled-reports", label: "Planlı Raporlar", desc: "Periyodik email raporları", Icon: Send },
  { href: "/dashboard/watchlists", label: "Watchlists", desc: "Eşik aşımı izleme", Icon: Eye },
  { href: "/dashboard/audit", label: "Aktivite Logu", desc: "KVKK audit trail", Icon: ScrollText },
  { href: "/dashboard/team", label: "Takım", desc: "Kullanıcı ve davetler", Icon: Users },
  { href: "/dashboard/security", label: "Güvenlik", desc: "İki faktörlü doğrulama", Icon: Shield },
  { href: "/dashboard/settings", label: "Ayarlar", desc: "Hesap ve tercihler", Icon: SettingsIcon },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle }}>
      <header style={{
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Logo size={28} />
        <div style={{ fontSize: 13, color: colors.textMuted }}>
          {session.user?.email}
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, margin: "0 0 8px", letterSpacing: -0.5 }}>
          Dashboard
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 15, marginBottom: 32 }}>
          Hoş geldiniz, {session.user?.name || session.user?.email?.split("@")[0]}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {items.map(({ href, label, desc, Icon }) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 24,
                cursor: "pointer",
                height: "100%",
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  background: colors.brandSoft,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <Icon size={20} color={colors.brand} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <NpsPrompt />
      <CookieConsent />
    </div>
  );
}
