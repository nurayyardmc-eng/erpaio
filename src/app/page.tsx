import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090F",
      color: "#E8EDF5",
      fontFamily: "monospace",
      display: "flex",
      flexDirection: "column",
    }}>
      <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #131A26" }}>
        <div style={{ color: "#00E5FF", fontSize: 11, letterSpacing: 4, fontWeight: 700 }}>ERPAIO</div>
        <nav style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <Link href="/login" style={{ color: "#9AA5B4", textDecoration: "none" }}>Giriş</Link>
          <Link href="/signup" style={{ color: "#00E5FF", textDecoration: "none" }}>Kayıt Ol →</Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: "60px 32px", maxWidth: 880, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 36, lineHeight: 1.2, margin: "0 0 16px", color: "#E8EDF5" }}>
          ERP&apos;nizle <span style={{ color: "#00E5FF" }}>Türkçe</span> konuşun.
        </h1>
        <p style={{ fontSize: 16, color: "#9AA5B4", lineHeight: 1.6, marginBottom: 32, maxWidth: 580 }}>
          Nebim V3, SAP, Oracle gibi sistemlerinize doğal dilde sorun, AI sorgu yazsın.
          Anomaly tespiti, WhatsApp + push bildirim, sıfır bekleme süreli dashboard.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 56 }}>
          <Link href="/signup" style={{
            background: "#00E5FF",
            color: "#07090F",
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}>
            Ücretsiz başla →
          </Link>
          <a href="mailto:demo@erpaio.com" style={{
            background: "transparent",
            color: "#9AA5B4",
            border: "1px solid #131A26",
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
          }}>
            Demo iste
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 60 }}>
          {[
            { icon: "🇹🇷", title: "Türkçe AI", desc: "Claude Sonnet 4 + Nebim V3 profile, %90+ doğruluk" },
            { icon: "⚡", title: "Sıfır bekleme", desc: "Pre-computed dashboard + query cache, anlık cevap" },
            { icon: "🔔", title: "Anomaly tespiti", desc: "Saatlik cron, WhatsApp + email + push alert" },
            { icon: "🛡️", title: "KVKK + GDPR", desc: "AES-256-GCM, audit log, read-only DB user" },
            { icon: "📱", title: "iOS + Android", desc: "App Store ve Play Store yayını yakında" },
            { icon: "🧠", title: "Kendi öğrenir", desc: "👍/👎 feedback ile zamanla daha iyi cevap" },
          ].map((f) => (
            <div key={f.title} style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "#9AA5B4", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0C1018", border: "1px solid #131A26", borderRadius: 12, padding: 32 }}>
          <div style={{ fontSize: 9, color: "#00E5FF", letterSpacing: 3, marginBottom: 8 }}>NASIL ÇALIŞIR</div>
          <ol style={{ color: "#9AA5B4", fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>ERP veritabanınız için <strong style={{ color: "#E8EDF5" }}>read-only user</strong> oluşturun (rehber: Settings)</li>
            <li>ERPAIO panelinde bağlantı bilgilerini girin → şema 30 saniyede taranır</li>
            <li>Sohbet ekranında Türkçe sorularınızı yazın → AI SQL üretir, çalıştırır</li>
            <li>Anomaly detector'lar 7/24 çalışır, kritik durumlarda WhatsApp&apos;a düşer</li>
          </ol>
        </div>
      </main>

      <footer style={{ padding: "24px 32px", borderTop: "1px solid #131A26", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3A4558" }}>
        <div>© 2026 ERPAIO</div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/privacy" style={{ color: "#3A4558", textDecoration: "none" }}>Gizlilik</Link>
          <Link href="/terms" style={{ color: "#3A4558", textDecoration: "none" }}>Koşullar</Link>
          <a href="mailto:support@erpaio.com" style={{ color: "#3A4558", textDecoration: "none" }}>Destek</a>
        </div>
      </footer>
    </div>
  );
}
