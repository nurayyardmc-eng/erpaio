import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
          }}>
            Ücretsiz Başla →
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: "80px 32px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{
            display: "inline-block",
            background: colors.brandSoft,
            color: colors.brand,
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: 0.3,
          }}>
            🇹🇷 Türkçe ERP AI Asistanı
          </div>
          <h1 style={{ fontSize: 56, lineHeight: 1.1, margin: "0 0 24px", color: colors.text, fontWeight: 800, letterSpacing: -1.5 }}>
            ERP&apos;nizle <span style={{ color: colors.brand }}>Türkçe</span> konuşun.
          </h1>
          <p style={{ fontSize: 18, color: colors.textMuted, lineHeight: 1.6, marginBottom: 40, maxWidth: 600 }}>
            Nebim V3, SAP, Oracle gibi sistemlerinize doğal dilde sorun, AI sorgu yazsın.
            Anomaly tespiti, WhatsApp + push bildirim, sıfır bekleme süreli dashboard.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 80 }}>
            <Link href="/signup" style={{
              background: colors.brand,
              color: colors.textInverse,
              padding: "14px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
            }}>
              Ücretsiz başla →
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
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 80,
        }}>
          {[
            { icon: "🇹🇷", title: "Türkçe AI", desc: "Claude Sonnet 4 + Nebim V3 profile, %90+ doğruluk" },
            { icon: "⚡", title: "Sıfır bekleme", desc: "Pre-computed dashboard + query cache, anlık cevap" },
            { icon: "🔔", title: "Anomaly tespiti", desc: "Saatlik cron, WhatsApp + email + push alert" },
            { icon: "🛡️", title: "KVKK + GDPR", desc: "AES-256-GCM, audit log, read-only DB user" },
            { icon: "📱", title: "iOS + Android", desc: "App Store ve Play Store yayını yakında" },
            { icon: "🧠", title: "Kendi öğrenir", desc: "👍/👎 feedback ile zamanla daha iyi cevap" },
          ].map((f) => (
            <div key={f.title} style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, color: colors.text, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: colors.bgSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 40,
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
          <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: "0 0 24px", letterSpacing: -0.5 }}>
            4 adımda canlı
          </h2>
          <ol style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.9, paddingLeft: 24, margin: 0 }}>
            <li>ERP veritabanınız için <strong style={{ color: colors.text }}>read-only user</strong> oluşturun</li>
            <li>ERPAIO panelinde bağlantı bilgilerini girin → şema 30 saniyede taranır</li>
            <li>Sohbet ekranında Türkçe sorularınızı yazın → AI SQL üretir, çalıştırır</li>
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
