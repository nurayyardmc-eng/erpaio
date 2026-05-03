import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Languages,
  Zap,
  Bell,
  Shield,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
    }}>
      <header style={{
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bg,
      }}>
        <Logo size={28} />
        <nav style={{ display: "flex", gap: 24, fontSize: 14, alignItems: "center" }}>
          <Link href="/pricing" style={{ color: colors.textMuted, fontWeight: 500 }}>Fiyatlandırma</Link>
          <Link href="/login" style={{ color: colors.textMuted, fontWeight: 500 }}>Giriş</Link>
          <Link href="/signup" style={{
            background: colors.brand,
            color: colors.textInverse,
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}>
            Ücretsiz Başla <ArrowRight size={14} />
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: "80px 32px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: colors.brandSoft,
            color: colors.brand,
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: 0.3,
          }}>
            <Sparkles size={14} />
            Türkçe ERP AI Asistanı
          </div>
          <h1 style={{
            fontSize: 56,
            lineHeight: 1.1,
            margin: "0 0 24px",
            color: colors.text,
            fontWeight: 800,
            letterSpacing: -1.5,
          }}>
            ERP&apos;nizle <span style={{ color: colors.brand }}>Türkçe</span> konuşun.
          </h1>
          <p style={{ fontSize: 18, color: colors.textMuted, lineHeight: 1.6, marginBottom: 40, maxWidth: 600 }}>
            Nebim V3, SAP, Oracle gibi sistemlerinize doğal dilde sorgu gönderin.
            Yapay zeka SQL üretir, anomalileri saatlik tespit eder, sıfır bekleme süreli dashboard sunar.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 80 }}>
            <Link href="/signup" style={{
              background: colors.brand,
              color: colors.textInverse,
              padding: "14px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}>
              Ücretsiz başla <ArrowRight size={16} />
            </Link>
            <a href="mailto:demo@erpaio.com" style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              padding: "14px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 500,
            }}>
              Demo iste
            </a>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 80,
        }}>
          {[
            { Icon: Languages, title: "Türkçe AI", desc: "Claude Sonnet 4 + Nebim V3 profili, %90+ doğruluk" },
            { Icon: Zap, title: "Sıfır bekleme", desc: "Pre-computed dashboard ve query cache, anlık cevap" },
            { Icon: Bell, title: "Anomaly tespiti", desc: "Saatlik cron, WhatsApp, email ve push bildirim" },
            { Icon: Shield, title: "KVKK + GDPR", desc: "AES-256-GCM şifreleme, audit log, read-only DB user" },
            { Icon: Smartphone, title: "iOS ve Android", desc: "App Store ve Play Store yayını yakında" },
            { Icon: Sparkles, title: "Kendi öğrenir", desc: "Geri bildirimle zamanla daha iyi cevap üretir" },
          ].map((f) => (
            <div key={f.title} style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 28,
            }}>
              <div style={{
                width: 44,
                height: 44,
                background: colors.brandSoft,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <f.Icon size={22} color={colors.brand} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 16, color: colors.text, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: colors.bgSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 48,
        }}>
          <div style={{
            fontSize: 11,
            color: colors.brand,
            letterSpacing: 3,
            marginBottom: 12,
            fontWeight: 700,
            textTransform: "uppercase",
          }}>
            Nasıl Çalışır
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: colors.text, margin: "0 0 28px", letterSpacing: -0.5 }}>
            4 adımda canlı
          </h2>
          <ol style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.9, paddingLeft: 24, margin: 0 }}>
            <li>ERP veritabanınız için <strong style={{ color: colors.text }}>read-only kullanıcı</strong> oluşturun</li>
            <li>ERPAIO panelinde bağlantı bilgilerini girin, şema 30 saniyede taranır</li>
            <li>Sohbet ekranında Türkçe sorularınızı yazın, AI SQL üretir ve çalıştırır</li>
            <li>Anomaly detector&apos;lar 7/24 çalışır, kritik durumlarda WhatsApp&apos;a düşer</li>
          </ol>
        </div>
      </main>

      <footer style={{
        padding: "24px 32px",
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        color: colors.textSubtle,
      }}>
        <div>© 2026 ERPAIO</div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy" style={{ color: colors.textSubtle }}>Gizlilik</Link>
          <Link href="/terms" style={{ color: colors.textSubtle }}>Koşullar</Link>
          <a href="mailto:support@erpaio.com" style={{ color: colors.textSubtle }}>Destek</a>
        </div>
      </footer>
    </div>
  );
}
