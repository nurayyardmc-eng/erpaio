import Link from "next/link";
import { Check, X as XIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export const metadata = {
  title: "Fiyatlandırma · ERPAIO",
  description: "ERPAIO planları ve fiyatlandırma",
};

const plans = [
  {
    name: "Starter",
    price: "₺499",
    period: "/ay",
    description: "Bireysel ve küçük takımlar için",
    features: [
      "1 ERP bağlantısı",
      "3 kullanıcıya kadar",
      "2M token / ay (~600 sorgu)",
      "WhatsApp + push bildirim",
      "Anomaly tespiti (saatlik + günlük)",
      "Şifreli credential storage",
    ],
    notIncluded: ["MFA", "CSV export", "On-prem agent"],
    cta: "14 gün ücretsiz dene",
  },
  {
    name: "Pro",
    price: "₺2.499",
    period: "/ay",
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
      "7/24 email destek",
    ],
    cta: "Pro'ya başla",
  },
  {
    name: "Enterprise",
    price: "Özel",
    period: "",
    description: "Bankalar, telekom, kamu",
    features: [
      "Sınırsız ERP bağlantısı",
      "500+ kullanıcı",
      "200M+ token / ay özel",
      "On-prem agent (kendi sunucunuz)",
      "SAML SSO",
      "Custom ERP profile (SAP, Oracle…)",
      "SLA: 99.9% uptime",
      "Adanmış destek mühendisi",
      "Penetrasyon testi raporu",
    ],
    cta: "Bizimle görüşün",
  },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text }}>
      <header style={{
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <Link href="/"><Logo size={28} variant="mark" /></Link>
        <Link href="/login" style={{ color: colors.textMuted, fontSize: 14, fontWeight: 500 }}>Giriş</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{
            fontSize: 40,
            margin: "0 0 12px",
            fontWeight: 800,
            color: colors.text,
            letterSpacing: -1,
          }}>
            Şirketinizin boyutuna göre
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>
            14 gün ücretsiz Pro deneme — kart bilgisi gerekmez
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {plans.map((p) => (
            <div key={p.name} style={{
              background: colors.card,
              border: `${p.popular ? 2 : 1}px solid ${p.popular ? colors.brand : colors.border}`,
              borderRadius: 16,
              padding: 32,
              position: "relative",
            }}>
              {p.popular && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: 24,
                  background: colors.brand,
                  color: colors.textInverse,
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}>
                  POPÜLER
                </div>
              )}
              <div style={{
                color: colors.brand,
                fontSize: 12,
                letterSpacing: 2,
                marginBottom: 12,
                fontWeight: 600,
                textTransform: "uppercase",
              }}>
                {p.name}
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: colors.text, letterSpacing: -1 }}>
                  {p.price}
                </span>
                <span style={{ color: colors.textMuted, fontSize: 16 }}>{p.period}</span>
              </div>
              <p style={{
                color: colors.textMuted,
                fontSize: 14,
                marginBottom: 28,
                lineHeight: 1.5,
              }}>
                {p.description}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{
                    color: colors.text,
                    fontSize: 14,
                    lineHeight: 1.6,
                    paddingLeft: 28,
                    position: "relative",
                    marginBottom: 8,
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 2, color: colors.brand }}>
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
                {p.notIncluded?.map((f) => (
                  <li key={f} style={{
                    color: colors.textSubtle,
                    fontSize: 14,
                    lineHeight: 1.6,
                    paddingLeft: 28,
                    position: "relative",
                    marginBottom: 8,
                    textDecoration: "line-through",
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 2 }}>
                      <XIcon size={16} strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={p.name === "Enterprise" ? "mailto:sales@erpaio.com" : "/signup"}
                style={{
                  display: "block",
                  background: p.popular ? colors.brand : colors.bg,
                  color: p.popular ? colors.textInverse : colors.brand,
                  border: `1px solid ${colors.brand}`,
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 56,
          textAlign: "center",
          color: colors.textSubtle,
          fontSize: 13,
        }}>
          KDV dahil değildir. Yıllık ödemede %20 indirim. Plan değişiklikleri pro-rata.
        </div>
      </main>

      <footer style={{
        padding: "24px 32px",
        borderTop: `1px solid ${colors.border}`,
        textAlign: "center",
        fontSize: 13,
        color: colors.textSubtle,
      }}>
        <Link href="/privacy" style={{ color: colors.textSubtle, marginRight: 20 }}>Gizlilik</Link>
        <Link href="/terms" style={{ color: colors.textSubtle }}>Koşullar</Link>
      </footer>
    </div>
  );
}
