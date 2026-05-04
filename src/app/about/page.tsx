import Link from "next/link";
import { ArrowLeft, Target, Eye, Heart } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export const metadata = { title: "Hakkımızda · ERPAIO" };

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      <a href="#main" className="skip-link">İçeriğe atla</a>
      <header style={{
        padding: "16px 32px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(250,250,248,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 10,
      }}>
        <Link href="/" aria-label="Ana sayfa"><Logo size={28} /></Link>
        <Link href="/" style={{
          color: colors.textMuted,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 500,
        }}>
          <ArrowLeft size={14} /> Ana sayfa
        </Link>
      </header>

      <main id="main" style={{ maxWidth: 760, margin: "0 auto", padding: "60px 32px 80px" }}>
        <div style={{
          color: colors.brand,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          Hakkımızda
        </div>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "clamp(36px, 5vw, 56px)",
          fontWeight: 400,
          letterSpacing: -1.5,
          margin: "0 0 24px",
          lineHeight: 1.1,
        }}>
          ERP&apos;leri <em style={{ fontStyle: "italic", color: colors.brand }}>kendi kendine öğrenen</em> sistemlere dönüştürüyoruz.
        </h1>
        <p style={{
          color: colors.textMuted,
          fontSize: 18,
          lineHeight: 1.7,
          marginBottom: 56,
          fontWeight: 300,
        }}>
          Türkiye&apos;de büyük ölçekli ERP sistemleri (Nebim, SAP, Oracle, Logo) yaygın olmasına rağmen
          gerçek zamanlı içgörü, anomaly tespiti ve doğal dilde sorgulama altyapısı çoğu zaman eksik.
          ERPAIO bu boşluğu kapatıyor — mevcut ERP&apos;ye dokunmadan, read-only bağlantıyla.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 56,
        }}>
          {[
            { Icon: Target, title: "Misyon", desc: "ERP'lerinizi ek bir yük bindirmeden, sürekli öğrenen ve karar destekleyen zekaya dönüştürmek." },
            { Icon: Eye, title: "Vizyon", desc: "Türkiye'nin önde gelen perakende, üretim ve finans firmaları için standart AI katmanı." },
            { Icon: Heart, title: "Değerler", desc: "Açıklanabilir AI · Read-only güvenlik · KVKK uyumu · İnsan onayı tabanlı icra." },
          ].map((c) => (
            <div key={c.title} className="elevated" style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <div style={{
                width: 40,
                height: 40,
                background: colors.brandSoft,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}>
                <c.Icon size={20} color={colors.brand} strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>{c.title}</h3>
              <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: colors.bgSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 36,
          textAlign: "center",
        }}>
          <h3 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: -0.5,
            margin: "0 0 12px",
          }}>
            İletişime geçin
          </h3>
          <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 460, marginInline: "auto" }}>
            Pilot süreç, kurumsal işbirliği veya teknik soru için bize yazın.
          </p>
          <a href="mailto:hello@erpaio.com" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: colors.text,
            color: colors.bg,
            padding: "12px 28px",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}>
            hello@erpaio.com
          </a>
        </div>

        <div style={{ marginTop: 40, textAlign: "center", color: colors.textSubtle, fontSize: 13 }}>
          © 2026 ERPAIO · İstanbul, Türkiye
        </div>
      </main>
    </div>
  );
}
