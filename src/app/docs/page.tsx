import Link from "next/link";

export const metadata = {
  title: "Dokümantasyon · ERPAIO",
};

const sections = [
  {
    title: "Başlangıç",
    items: [
      { title: "Hesap oluştur ve giriş yap", desc: "Signup, login, MFA kurulumu" },
      { title: "ERP bağlantısı ekle", desc: "Read-only user oluşturma + bağlantı testi" },
      { title: "İlk Türkçe sorunu sor", desc: "Chat akışı, Türkçe → SQL → sonuç" },
    ],
  },
  {
    title: "Güvenlik",
    items: [
      { title: "Read-only DB user oluşturma", desc: "SQL Server için GRANT/DENY rehberi", href: "https://github.com/nurayyardmc-eng/erpaio/blob/main/marketing/customer-onboarding/db-readonly-user.md" },
      { title: "İki faktörlü doğrulama (MFA)", desc: "TOTP authenticator app kurulumu" },
      { title: "KVKK + GDPR uyum", desc: "Veri saklama, silme hakkı, audit log" },
    ],
  },
  {
    title: "Özellikler",
    items: [
      { title: "Anomaly detection", desc: "Saatlik/günlük cron, WhatsApp + email + push" },
      { title: "Pre-computed dashboard", desc: "Sıfır bekleme metrikleri" },
      { title: "Sohbet geçmişi + 👍/👎 feedback", desc: "Self-improving query cache" },
      { title: "Şema açıklamaları", desc: "Admin override (özel tablo notları)" },
      { title: "CSV export + edit-SQL", desc: "Sonuçları indir, SQL düzenle yeniden çalıştır" },
    ],
  },
  {
    title: "Mobil & Desktop",
    items: [
      { title: "iOS / Android app", desc: "Expo, App Store + Play Store yayını yakında" },
      { title: "Desktop (Mac/Windows)", desc: "Tauri wrapper, signed binary" },
    ],
  },
  {
    title: "Geliştirici",
    items: [
      { title: "API token oluşturma", desc: "Mobile + desktop için Bearer token" },
      { title: "Webhook entegrasyonu", desc: "Yakında" },
      { title: "Open source agent", desc: "On-prem deployment için (Faza 10.6)" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit" }}>
      <header style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB" }}>
        <Link href="/" style={{ color: "#1A2B47", fontSize: 11, letterSpacing: 4, fontWeight: 700, textDecoration: "none" }}>ERPAIO</Link>
        <Link href="/login" style={{ color: "#475569", fontSize: 12, textDecoration: "none" }}>Giriş</Link>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "60px 32px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Dokümantasyon</h1>
        <p style={{ color: "#475569", fontSize: 14, marginBottom: 40 }}>
          ERPAIO&apos;yu nasıl kuracağınız ve kullanacağınızla ilgili rehberler.
          Belge eksikse: <a href="mailto:support@erpaio.com" style={{ color: "#1A2B47" }}>support@erpaio.com</a>
        </p>

        {sections.map((s) => (
          <section key={s.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 14, color: "#1A2B47", marginBottom: 16 }}>{s.title}</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {s.items.map((it) => (
                <a
                  key={it.title}
                  href={it.href ?? "#"}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: 14,
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {it.title}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{it.desc}</div>
                </a>
              ))}
            </div>
          </section>
        ))}

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, marginTop: 40, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
          <strong style={{ color: "#1A2B47" }}>Pilot kullanıcısıysanız:</strong> Onboarding sürecinde Customer Success ekibimizle 1-2 saatlik kurulum görüşmesi yapacağız. Anlam çıkmayan tablolar için annotation girişi, anomaly threshold tuning, custom rapor talep edebilirsiniz.
        </div>
      </main>

      <footer style={{ padding: "24px 32px", borderTop: "1px solid #E5E7EB", textAlign: "center", fontSize: 11, color: "#94A3B8" }}>
        <Link href="/privacy" style={{ color: "#94A3B8", textDecoration: "none", marginRight: 16 }}>Gizlilik</Link>
        <Link href="/terms" style={{ color: "#94A3B8", textDecoration: "none", marginRight: 16 }}>Koşullar</Link>
        <Link href="/pricing" style={{ color: "#94A3B8", textDecoration: "none" }}>Fiyatlar</Link>
      </footer>
    </div>
  );
}
