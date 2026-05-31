// Sprint F.4 — Data Processing Agreement template (KVKK md. 12 + GDPR Art. 28).
// Sprint F.7 — EN locale eklendi. Cookie-based locale (erpaio_lang) ile
// otomatik dil seçimi; ?lang query parametresi explicit override.
//
// Bu sayfa enterprise satış sürecinde Müşteri (Veri Sorumlusu) ile imzalanacak
// DPA'nın kamuya açık şablonudur. Asıl bağlayıcı versiyon PDF olarak ayrıca
// imzalatılır. Sayfa şablonu privacy/terms ile aynı görsel dilde tutulur.

import Link from "next/link";
import { cookies } from "next/headers";

type Locale = "tr" | "en";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("erpaio_lang")?.value;
  const locale: Locale = params.lang === "en" || cookieLang === "en" ? "en" : "tr";
  return locale === "en"
    ? {
        title: "Data Processing Agreement (DPA) · ERPAIO",
        description: "KVKK + GDPR-compliant Data Processing Agreement template.",
      }
    : {
        title: "Veri İşleme Sözleşmesi (DPA) · ERPAIO",
        description: "KVKK + GDPR uyumlu Veri İşleme Sözleşmesi şablonu.",
      };
}

export default async function DpaPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("erpaio_lang")?.value;
  const locale: Locale = params.lang === "en" || cookieLang === "en" ? "en" : "tr";
  const t = locale === "en" ? EN : TR;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      color: "#0F172A",
      fontFamily: "inherit",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3 }}>ERPAIO</div>
          <div style={{ fontSize: 11 }}>
            <Link href="/dpa?lang=tr" style={{ color: locale === "tr" ? "#0A0A0A" : "#94A3B8", marginRight: 12 }}>TR</Link>
            <Link href="/dpa?lang=en" style={{ color: locale === "en" ? "#0A0A0A" : "#94A3B8" }}>EN</Link>
          </div>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t.title}</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24 }}>{t.subtitle}</p>

        <div style={{
          background: "#FEF3C7",
          border: "1px solid #F59E0B",
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 32,
          fontSize: 11,
          color: "#92400E",
          lineHeight: 1.6,
        }}>
          <strong>{t.warningTitle}</strong> {t.warningBody}{" "}
          <a href="mailto:legal@erpaio.com" style={{ color: "#92400E", textDecoration: "underline" }}>legal@erpaio.com</a>
        </div>

        {t.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            <div dangerouslySetInnerHTML={{ __html: s.body }} />
          </Section>
        ))}

        <Section title={t.subProcessorsTitle}>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {t.subProcessorsHeaders.map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#0A0A0A", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((sp) => (
                  <tr key={sp.name} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "6px 10px", color: "#0F172A" }}>{sp.name}</td>
                    <td style={{ padding: "6px 10px", color: "#475569" }}>{sp.location}</td>
                    <td style={{ padding: "6px 10px", color: "#475569" }}>{locale === "en" ? sp.purposeEn : sp.purposeTr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>{t.subProcessorsFooter}</p>
        </Section>

        <Section title={t.contactTitle}>
          <div dangerouslySetInnerHTML={{ __html: t.contactBody }} />
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E5E7EB", fontSize: 11, color: "#94A3B8" }}>
          {t.relatedLabel}{" "}
          <Link href="/privacy" style={{ color: "#475569" }}>{t.privacyLink}</Link>
          {" · "}
          <Link href="/terms" style={{ color: "#475569" }}>{t.termsLink}</Link>
        </div>
      </div>
    </div>
  );
}

const SUB_PROCESSORS = [
  { name: "Vercel, Inc.", location: "USA (SCC)", purposeTr: "Uygulama hosting (Next.js)", purposeEn: "Application hosting (Next.js)" },
  { name: "Supabase, Inc.", location: "EU (Frankfurt)", purposeTr: "Postgres veritabanı", purposeEn: "Postgres database" },
  { name: "Anthropic, PBC", location: "USA (DPA)", purposeTr: "Claude AI sorgu üretimi", purposeEn: "Claude AI query generation" },
  { name: "Twilio, Inc.", location: "USA (SCC)", purposeTr: "WhatsApp bildirim", purposeEn: "WhatsApp notifications" },
  { name: "Resend, Inc.", location: "USA (DPA)", purposeTr: "Email bildirim", purposeEn: "Email notifications" },
  { name: "Upstash, Inc.", location: "EU (Frankfurt)", purposeTr: "Redis rate-limit", purposeEn: "Redis rate-limit" },
  { name: "Sentry (Functional Software)", location: "USA (SCC)", purposeTr: "Hata raporlama", purposeEn: "Error reporting" },
  { name: "Stripe, Inc.", location: "Ireland + USA", purposeTr: "Global ödeme (TR dışı)", purposeEn: "Global payments (non-TR)" },
  { name: "iyzico Ödeme Hizmetleri A.Ş.", location: "Turkey", purposeTr: "TR ödeme", purposeEn: "TR payments" },
  { name: "GitHub, Inc.", location: "USA (DPA)", purposeTr: "CI/CD + cron", purposeEn: "CI/CD + cron" },
];

const TR = {
  title: "Veri İşleme Sözleşmesi (DPA)",
  subtitle: "v1.0-draft · Son güncelleme: 2026-05-31",
  warningTitle: "Bu sayfa şablondur.",
  warningBody: "Enterprise müşteri ile bağlayıcı versiyon ayrı PDF olarak hazırlanır ve avukat onayından geçer. DPA talep etmek için",
  subProcessorsTitle: "5. Alt-işleyiciler (sub-processors)",
  subProcessorsHeaders: ["Hizmet", "Konum", "Amaç"],
  subProcessorsFooter: "Yeni alt-işleyici eklenmeden 14 gün önce Müşteriye e-posta ile bildirimde bulunulur.",
  contactTitle: "11. İletişim",
  contactBody: 'DPA imzalatma ve hukuki konular için: <a href="mailto:legal@erpaio.com" style="color:#0A0A0A">legal@erpaio.com</a><br/>Veri ihlali bildirim: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a><br/>Genel destek: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>',
  relatedLabel: "İlgili:",
  privacyLink: "Gizlilik Politikası",
  termsLink: "Kullanım Şartları",
  sections: [
    {
      title: "0. Taraflar",
      body: '<strong>Veri Sorumlusu</strong> (&quot;Müşteri&quot;): bu sözleşmeye taraf olan tüzel kişi.<br/><strong>Veri İşleyen</strong> (&quot;ERPAIO&quot;): bu hizmeti sunan tüzel kişi.<br/><br/>Müşteri, KVKK md. 3/ı ve GDPR Art. 4(7) anlamında <strong>veri sorumlusudur</strong>; ERPAIO, KVKK md. 3/ğ ve GDPR Art. 4(8) anlamında <strong>veri işleyendir</strong>.',
    },
    {
      title: "1. Konu ve süre",
      body: "ERPAIO; Müşterinin Türkçe doğal dil arayüzü üzerinden kendi ERP veritabanına sorgu yapmasını, anomaly tespiti ve bildirim almasını sağlayan bir SaaS hizmeti sunar. Bu DPA, ana hizmet sözleşmesinin (MSA) eki olarak Müşteri ile ERPAIO arasındaki kişisel veri işleme ilişkisini düzenler. Süre, ana hizmet sözleşmesi süresi ile aynıdır.",
    },
    {
      title: "2. İşlenen veri kategorileri",
      body: "Müşterinin hizmet üzerinden ERPAIO&apos;ya aktardığı veriler: hesap verisi (ad, e-posta, hashlenmiş şifre, oturum tokenları, MFA secret); ERP bağlantı verisi (host, port, DB adı, kullanıcı adı, AES-256-GCM ile şifrelenmiş parola); sorgu içeriği (doğal dil soruları, üretilen SQL, sonuçların ilk 100 satırı); aktivite kayıtları (giriş/çıkış, IP, user-agent); bildirim metadata&apos;sı. Özel nitelikli kişisel veri toplanmaz.",
    },
    {
      title: "3. İşleme amacı ve hukuki dayanak",
      body: "ERPAIO, kişisel verileri yalnızca Müşterinin <strong>yazılı talimatı doğrultusunda</strong> ve sözleşme kapsamında hizmet sunma, güvenlik/kullanılabilirlik sağlama, faturalandırma ve yasal yükümlülükler için işler. Kendi pazarlama, satış veya profilleme amacıyla <strong>işlemez</strong>.",
    },
    {
      title: "4. Veri işleyenin yükümlülükleri",
      body: "Verileri yalnızca bu DPA ve Müşteri talimatları doğrultusunda işlemek; personelin yazılı gizlilik taahhütünü sağlamak; madde 7 önlemlerini uygulamak; alt-işleyici öncesinde 14 gün bildirim; veri sahibi hakları için API/UI sağlamak; <strong>veri ihlali tespitinden 72 saat içinde</strong> Müşteriye bildirimde bulunmak (GDPR Art. 33); denetim otoritesine işbirliği.",
    },
    {
      title: "6. Uluslararası veri transferi",
      body: 'ABD&apos;de işlenen veriler için <strong>AB Standart Sözleşme Maddeleri</strong> (SCC 2021/914) uygulanır. KVKK md. 9 kapsamında Türkiye&apos;den çıkışlar için açık rıza alınır; signup KVKK onayı <code style="font-family:ui-monospace,Menlo,monospace">consent_log</code> tablosunda audit edilir.',
    },
    {
      title: "7. Teknik ve organizasyonel önlemler",
      body: "<strong>Şifreleme:</strong> ERP parolaları AES-256-GCM (key rotation); disk şifrelemesi AES-256; TLS 1.2+, HSTS; kullanıcı şifreleri bcrypt cost 12.<br/><strong>Erişim:</strong> Multi-tenant izolasyon (tenantId boundary); rol bazlı (owner/member/sysadmin); MFA TOTP, sysadmin için zorunlu; 50+ test ile read-only SQL validator.<br/><strong>İş sürekliliği:</strong> Haftalık otomatik DB yedeklemesi (pg_dump, 30 gün retention); Sentry; health endpoint.",
    },
    {
      title: "8. Veri sahibi hakları",
      body: "Erişim/taşınabilirlik: /dashboard/settings → Veri export (JSON+JSONL). Silme: /dashboard/settings → DangerZone → Hesabı sil (cascade). Düzeltme: profil sayfasından. İşlemenin sınırlandırılması: destek talebi.",
    },
    {
      title: "9. Sözleşme sonu",
      body: "Sözleşmenin sona ermesi halinde Müşteri, <strong>30 gün içinde</strong> verilerinin tam export&apos;unu indirebilir veya silinmesini talep edebilir. 30 günlük geçişin sonunda ERPAIO Müşteri verilerini kalıcı olarak siler (yedek kopyalar dahil en geç 60 gün içinde). Audit logları (ActivityLog, ConsentLog) yasal retention gereği 2 yıl saklanır.",
    },
    {
      title: "10. Denetim",
      body: "Müşteri, yılda <strong>bir defaya</strong> mahsus olmak üzere bu DPA&apos;ya uyumu denetleme hakkına sahiptir. ERPAIO ISO 27001 veya SOC 2 sertifikası aldığında bu raporlar denetim yerine geçer.",
    },
  ],
};

const EN = {
  title: "Data Processing Agreement (DPA)",
  subtitle: "v1.0-draft · Last updated: 2026-05-31",
  warningTitle: "This is a template.",
  warningBody: "The binding version for enterprise customers is prepared as a separate PDF and reviewed by legal counsel. To request a DPA, contact",
  subProcessorsTitle: "5. Sub-processors",
  subProcessorsHeaders: ["Service", "Location", "Purpose"],
  subProcessorsFooter: "Customer is notified by email at least 14 days before any new sub-processor is added.",
  contactTitle: "11. Contact",
  contactBody: 'For DPA signing and legal matters: <a href="mailto:legal@erpaio.com" style="color:#0A0A0A">legal@erpaio.com</a><br/>Data breach notification: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a><br/>General support: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>',
  relatedLabel: "Related:",
  privacyLink: "Privacy Policy",
  termsLink: "Terms of Service",
  sections: [
    {
      title: "0. Parties",
      body: '<strong>Data Controller</strong> (&quot;Customer&quot;): the legal entity party to this agreement.<br/><strong>Data Processor</strong> (&quot;ERPAIO&quot;): the legal entity providing the service.<br/><br/>Customer is the <strong>data controller</strong> per KVKK Art. 3(ı) and GDPR Art. 4(7); ERPAIO is the <strong>data processor</strong> per KVKK Art. 3(ğ) and GDPR Art. 4(8).',
    },
    {
      title: "1. Subject matter and duration",
      body: "ERPAIO is a SaaS service that lets Customer query its own ERP database via a Turkish natural-language interface, detect anomalies, and receive notifications. This DPA is annexed to the Master Services Agreement (MSA) and governs the personal data processing relationship between Customer and ERPAIO. Term is co-terminus with the MSA.",
    },
    {
      title: "2. Categories of data processed",
      body: "Data Customer transfers to ERPAIO through the service: account data (name, email, bcrypt-hashed password, session tokens, MFA secret); ERP connection data (host, port, DB name, username, AES-256-GCM-encrypted password); query content (natural language questions, generated SQL, first 100 result rows); activity logs (login/logout, IP, user-agent); notification metadata. No special-category personal data is collected.",
    },
    {
      title: "3. Purpose and legal basis",
      body: "ERPAIO processes personal data only on <strong>Customer&apos;s documented instructions</strong> and for the purposes of delivering the service, ensuring security/availability/quality, billing, customer support, and legal compliance. ERPAIO does <strong>not</strong> process the data for its own marketing, sales, or profiling.",
    },
    {
      title: "4. Processor obligations",
      body: "Process data only per this DPA and Customer instructions; ensure personnel are bound by written confidentiality; apply the measures in clause 7; provide 14-day prior notice before new sub-processors; provide API/UI for data-subject rights; notify Customer of a data breach <strong>within 72 hours</strong> of detection (GDPR Art. 33); cooperate with supervisory authorities.",
    },
    {
      title: "6. International data transfers",
      body: 'Data processed in the USA is governed by <strong>EU Standard Contractual Clauses</strong> (SCC 2021/914). Under KVKK Art. 9, transfers out of Turkey rely on explicit consent; signup KVKK consent is audited in the <code style="font-family:ui-monospace,Menlo,monospace">consent_log</code> table.',
    },
    {
      title: "7. Technical and organizational measures",
      body: "<strong>Encryption:</strong> ERP credentials AES-256-GCM (with key rotation); disk encryption AES-256; transit TLS 1.2+, HSTS; user passwords bcrypt cost 12.<br/><strong>Access control:</strong> multi-tenant isolation (tenantId boundary on every query); role-based (owner/member/sysadmin); MFA TOTP, mandatory for sysadmins; read-only SQL validator (50+ tests).<br/><strong>Business continuity:</strong> weekly automated DB backups (pg_dump, 30-day retention); Sentry observability; health endpoint.",
    },
    {
      title: "8. Data-subject rights",
      body: "Access/portability: /dashboard/settings → Data export (JSON+JSONL). Erasure: /dashboard/settings → DangerZone → Delete account (cascade). Rectification: directly from the profile page. Restriction of processing: by support request.",
    },
    {
      title: "9. Termination",
      body: "Upon termination, Customer may within <strong>30 days</strong> download a full export of its data or request deletion. At the end of the 30-day transition period, ERPAIO permanently deletes Customer data (including backup copies, within 60 days at the latest). Audit logs (ActivityLog, ConsentLog) are retained for 2 years due to statutory retention obligations.",
    },
    {
      title: "10. Audit rights",
      body: "Customer may audit ERPAIO&apos;s compliance with this DPA <strong>once per calendar year</strong>. ISO 27001 or SOC 2 attestation reports from ERPAIO, once obtained, may substitute for an on-site audit.",
    },
  ],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, color: "#0A0A0A", marginBottom: 12 }}>{title}</h2>
      <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
