import Link from "next/link";

export const metadata = {
  title: "Fiyatlandırma · ERPAIO",
  description: "ERPAIO planları ve fiyatlandırma",
};

const plans = [
  {
    name: "Starter",
    price: "₺499",
    period: "/ay",
    color: "#69FF47",
    description: "Bireysel ve küçük takımlar için",
    features: [
      "1 ERP bağlantısı",
      "3 kullanıcıya kadar",
      "2M token / ay (~600 sorgu)",
      "WhatsApp + push notification",
      "Anomaly detection (saatlik+günlük)",
      "Şifreli credential storage",
    ],
    notIncluded: ["MFA", "CSV export", "On-prem agent"],
    cta: "14 gün ücretsiz dene",
  },
  {
    name: "Pro",
    price: "₺2.499",
    period: "/ay",
    color: "#00E5FF",
    popular: true,
    description: "Büyüyen şirketler için",
    features: [
      "10 ERP bağlantısı",
      "25 kullanıcıya kadar",
      "20M token / ay (~6.000 sorgu)",
      "Email + WhatsApp + push",
      "Şema annotation (admin override)",
      "Audit log + CSV export",
      "Pre-computed dashboard",
      "İki faktörlü doğrulama (MFA)",
      "👍 7/24 email destek",
    ],
    cta: "Pro&apos;ya başla",
  },
  {
    name: "Enterprise",
    price: "Özel",
    period: "",
    color: "#9C8AFF",
    description: "Bankalar, telekom, kamu",
    features: [
      "Sınırsız ERP bağlantısı",
      "500+ kullanıcı",
      "200M+ token / ay özel",
      "On-prem agent (kendi sunucunuz)",
      "SAML SSO",
      "Custom ERP profile (SAP, Oracle...)",
      "SLA: 99.9% uptime",
      "Adanmış destek mühendisi",
      "Penetrasyon testi raporu",
    ],
    cta: "Bizimle görüşün",
  },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace" }}>
      <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #131A26" }}>
        <Link href="/" style={{ color: "#00E5FF", fontSize: 11, letterSpacing: 4, fontWeight: 700, textDecoration: "none" }}>ERPAIO</Link>
        <Link href="/login" style={{ color: "#9AA5B4", fontSize: 12, textDecoration: "none" }}>Giriş</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>Şirketinizin boyutuna göre</h1>
          <p style={{ color: "#9AA5B4", fontSize: 14 }}>14 gün ücretsiz Pro deneme — kart bilgisi gerekmez</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {plans.map((p) => (
            <div key={p.name} style={{
              background: "#0C1018",
              border: `1px solid ${p.popular ? p.color : "#131A26"}`,
              borderRadius: 12,
              padding: 28,
              position: "relative",
            }}>
              {p.popular && (
                <div style={{
                  position: "absolute", top: -10, left: 20,
                  background: p.color, color: "#07090F",
                  padding: "2px 10px", borderRadius: 4,
                  fontSize: 9, fontWeight: 700, letterSpacing: 2,
                }}>
                  POPÜLER
                </div>
              )}
              <div style={{ color: p.color, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>{p.name.toUpperCase()}</div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>{p.price}</span>
                <span style={{ color: "#9AA5B4", fontSize: 14 }}>{p.period}</span>
              </div>
              <p style={{ color: "#9AA5B4", fontSize: 12, marginBottom: 24, lineHeight: 1.5 }}>{p.description}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ color: "#E8EDF5", fontSize: 12, lineHeight: 1.7, paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: p.color }}>✓</span>
                    {f}
                  </li>
                ))}
                {p.notIncluded?.map((f) => (
                  <li key={f} style={{ color: "#3A4558", fontSize: 12, lineHeight: 1.7, paddingLeft: 18, position: "relative", textDecoration: "line-through" }}>
                    <span style={{ position: "absolute", left: 0 }}>✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={p.name === "Enterprise" ? "mailto:sales@erpaio.com" : "/signup"} style={{
                display: "block",
                background: p.popular ? p.color : "transparent",
                color: p.popular ? "#07090F" : p.color,
                border: `1px solid ${p.color}`,
                borderRadius: 8,
                padding: "12px",
                textAlign: "center",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 600,
              }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: "center", color: "#3A4558", fontSize: 11 }}>
          KDV dahil değildir. Yıllık ödemede %20 indirim. Plan değişiklikleri pro-rata.
        </div>
      </main>

      <footer style={{ padding: "24px 32px", borderTop: "1px solid #131A26", textAlign: "center", fontSize: 11, color: "#3A4558" }}>
        <Link href="/privacy" style={{ color: "#3A4558", textDecoration: "none", marginRight: 16 }}>Gizlilik</Link>
        <Link href="/terms" style={{ color: "#3A4558", textDecoration: "none" }}>Koşullar</Link>
      </footer>
    </div>
  );
}
