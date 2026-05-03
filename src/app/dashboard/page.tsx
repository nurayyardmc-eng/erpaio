import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NpsPrompt from "@/components/NpsPrompt";
import CookieConsent from "@/components/CookieConsent";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

const items = [
  { href: "/dashboard/overview", label: "Anlık Metrikler", desc: "Pre-computed dashboard", icon: "📊" },
  { href: "/dashboard/connections", label: "ERP Bağlantıları", desc: "Nebim V3 bağlantısı ekle", icon: "🔌" },
  { href: "/dashboard/chat", label: "Soru Sor", desc: "Türkçe soru → SQL → Cevap", icon: "💬" },
  { href: "/dashboard/alerts", label: "Bildirimler", desc: "Anomali ve uyarılar", icon: "🔔" },
  { href: "/dashboard/annotations", label: "Şema Açıklamaları", desc: "Tablo/kolon notları", icon: "📝" },
  { href: "/dashboard/insights", label: "Şema Analizi", desc: "FK çıkarımı + custom alanlar", icon: "🔍" },
  { href: "/dashboard/saved", label: "Kayıtlı Sorgular", desc: "Sık kullanılanlar", icon: "⭐" },
  { href: "/dashboard/scheduled-reports", label: "Planlı Raporlar", desc: "Email ile periyodik rapor", icon: "📧" },
  { href: "/dashboard/watchlists", label: "Watchlists", desc: "Eşik aşımı izleme", icon: "👁️" },
  { href: "/dashboard/audit", label: "Aktivite Logu", desc: "KVKK audit trail", icon: "📋" },
  { href: "/dashboard/team", label: "Takım", desc: "Kullanıcı ve davetler", icon: "👥" },
  { href: "/dashboard/security", label: "Güvenlik (MFA)", desc: "İki faktörlü doğrulama", icon: "🔒" },
  { href: "/dashboard/settings", label: "Ayarlar", desc: "Hesap ve tercihler", icon: "⚙️" },
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
          Hoş geldin, {session.user?.name || session.user?.email?.split("@")[0]}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 20,
                transition: "all 0.15s",
                cursor: "pointer",
                height: "100%",
              }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
                  {item.desc}
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
