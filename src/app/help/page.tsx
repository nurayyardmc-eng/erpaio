import Link from "next/link";
import { ArrowLeft, BookOpen, MessageCircle, Mail, Activity, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export const metadata = { title: "Yardım · ERPAIO" };

interface FaqItem { q: string; a: string }

const faqs: { group: string; items: FaqItem[] }[] = [
  {
    group: "Başlangıç",
    items: [
      { q: "İlk ERP bağlantımı nasıl eklerim?", a: "Dashboard → Bağlantılar → Yeni Bağlantı butonuna basın. Read-only DB kullanıcısı oluşturun (önemli — sadece SELECT yetkisi olsun), host/port/dbname/username/password girin. Şema 30 saniyede taranır." },
      { q: "Hangi ERP'ler destekleniyor?", a: "MS SQL Server üzerinde: Nebim V3, SAP S/4HANA (DB direct), Dynamics 365. PostgreSQL üzerinde: Odoo, ERPNext, custom uygulamalar. Yeni profile ekleme için support@erpaio.com." },
      { q: "Read-only kullanıcı güvenli mi?", a: "Evet — SELECT dışında hiçbir şey çalıştıramaz. Validatör 15+ tehlikeli pattern'i bloklar (DROP/DELETE/UPDATE/EXEC vb.). Tüm sorgular audit log'a yazılır." },
    ],
  },
  {
    group: "Sohbet & AI",
    items: [
      { q: "Hangi dilde soru sormalıyım?", a: "Türkçe veya İngilizce. AI Türkçe iş terimlerini (sipariş, stok, müşteri, fatura) doğru anlar. Daha karmaşık soruları parçalayın." },
      { q: "Confidence skoru nedir?", a: "AI'nin sorgudan ne kadar emin olduğunu gösterir. <0.7 ise onay isteyebilir. Onaylamadan önce SQL'i okuyup kontrol edebilirsiniz." },
      { q: "Yanlış cevap aldım, ne yapmalıyım?", a: "👎 (thumbs down) butonuna basın. AI bu feedback'ten öğrenir, gelecekte daha doğru cevap verir. Şema açıklamaları ekleyerek de iyileştirebilirsiniz." },
    ],
  },
  {
    group: "Bildirimler & Anomaly",
    items: [
      { q: "Anomaly tespiti ne sıklıkla çalışır?", a: "Her saat başı (cron). Pozitif/negatif sinyal eşiği geçildiğinde bildirim oluşturur. WhatsApp + email + push olarak yollanır (ayarlarda kanal seçilir)." },
      { q: "Bildirim ayarlarımı nasıl değiştiririm?", a: "Settings → Alert Eşiği'nden minimum severity'yi (low/medium/high/critical) ayarlayın. Sadece o seviye ve üzeri bildirimler gönderilir." },
    ],
  },
  {
    group: "Hesap & Faturalandırma",
    items: [
      { q: "Plan nasıl yükseltilir?", a: "Şu an pilot dönemde manuel faturalandırma. support@erpaio.com'a yazın, plan değişikliği 24 saat içinde yapılır." },
      { q: "Hesabımı nasıl silerim?", a: "Settings → Tehlikeli Bölge → Hesabı Sil. Şifre + 'HESABIMI SİL' yazarak onaylanır. Tüm veriler kaskat (cascade) olarak kalıcı silinir (KVKK md. 7)." },
      { q: "Verilerimi nasıl indiririm?", a: "Settings → Veri Export bölümünden owner kullanıcı tüm tenant verisini JSON olarak indirebilir. Mobile'da aynı bölümde Share intent ile paylaşılır. KVKK md. 11 / GDPR Art. 20 (data portability) hakkı kapsamındadır." },
    ],
  },
];

export default function HelpPage() {
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
        <Link href="/" aria-label="Ana sayfa"><Logo size={28} variant="mark" /></Link>
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

      <main id="main" style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px 80px" }}>
        <div style={{
          color: colors.brand,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          Yardım Merkezi
        </div>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "clamp(36px, 5vw, 52px)",
          fontWeight: 400,
          letterSpacing: -1.5,
          margin: "0 0 16px",
          lineHeight: 1.1,
        }}>
          Size nasıl yardımcı olabiliriz?
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 17, lineHeight: 1.6, marginBottom: 48, maxWidth: 560 }}>
          Sık sorulanlar, hızlı kılavuzlar ve destek kanalları.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 48,
        }}>
          <ContactCard Icon={MessageCircle} title="Email Destek" desc="24 saat içinde dönüş" href="mailto:support@erpaio.com" cta="support@erpaio.com" />
          <ContactCard Icon={BookOpen} title="API Dokümantasyon" desc="OpenAPI 3.1 spec" href="/docs/api" cta="/docs/api" />
          <ContactCard Icon={Activity} title="Sistem Durumu" desc="Servis sağlığı + uptime" href="/status" cta="/status" />
          <ContactCard Icon={Mail} title="Satış & Demo" desc="Pilot ve enterprise" href="mailto:demo@erpaio.com" cta="demo@erpaio.com" />
        </div>

        <h2 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: -1,
          margin: "0 0 24px",
        }}>
          Sık Sorulanlar
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {faqs.map((g) => (
            <div key={g.group}>
              <div style={{
                color: colors.textSubtle,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 12,
              }}>
                {g.group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((item, i) => (
                  <details
                    key={i}
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: "14px 18px",
                    }}
                  >
                    <summary style={{
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 500,
                      color: colors.text,
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}>
                      <span>{item.q}</span>
                      <ChevronDown size={16} color={colors.textMuted} />
                    </summary>
                    <p style={{
                      color: colors.textMuted,
                      fontSize: 14,
                      lineHeight: 1.7,
                      margin: "12px 0 0",
                    }}>
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 56,
          padding: 28,
          background: colors.bgSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          textAlign: "center",
        }}>
          <h3 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: -0.5,
            margin: "0 0 8px",
          }}>
            Cevap bulamadınız mı?
          </h3>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: "0 0 20px" }}>
            Direkt bizimle iletişime geçin, 24 saat içinde dönüş yaparız.
          </p>
          <a href="mailto:support@erpaio.com" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: colors.text,
            color: colors.bg,
            padding: "12px 28px",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
          }}>
            <Mail size={16} /> support@erpaio.com
          </a>
        </div>
      </main>
    </div>
  );
}

function ContactCard({ Icon, title, desc, href, cta }: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="elevated" style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      display: "block",
      textDecoration: "none",
    }}>
      <div style={{
        width: 40,
        height: 40,
        background: colors.brandSoft,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}>
        <Icon size={20} color={colors.brand} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 4px" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
        {desc}
      </div>
      <div style={{ fontSize: 12, color: colors.brand, fontWeight: 500, fontFamily: "ui-monospace, Menlo, Monaco, monospace" }}>
        {cta} →
      </div>
    </Link>
  );
}
