// Sprint F.8 — Privacy Policy bilingual (TR + EN). Cookie-based locale
// (erpaio_lang) ile otomatik dil seçimi; ?lang query parametresi explicit
// override. Pattern identical to /dpa (Sprint F.7).

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
    ? { title: "Privacy Policy · ERPAIO", description: "ERPAIO Privacy Policy — KVKK + GDPR compliant." }
    : { title: "Gizlilik Politikası · ERPAIO", description: "ERPAIO gizlilik politikası — KVKK + GDPR uyumlu." };
}

export default async function PrivacyPage({
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
            <Link href="/privacy?lang=tr" style={{ color: locale === "tr" ? "#0A0A0A" : "#94A3B8", marginRight: 12 }}>TR</Link>
            <Link href="/privacy?lang=en" style={{ color: locale === "en" ? "#0A0A0A" : "#94A3B8" }}>EN</Link>
          </div>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t.title}</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 32 }}>{t.subtitle}</p>

        {t.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            {s.list ? (
              <>
                <List items={s.list} />
                {s.afterList && <div dangerouslySetInnerHTML={{ __html: s.afterList }} />}
              </>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: s.body ?? "" }} />
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}

interface Sec {
  title: string;
  body?: string;
  list?: string[];
  afterList?: string;
}

const TR: { title: string; subtitle: string; sections: Sec[] } = {
  title: "Gizlilik Politikası",
  subtitle: "Son güncelleme: 2026-05-31",
  sections: [
    {
      title: "1. Genel",
      body: 'ERPAIO (&quot;hizmet&quot;, &quot;biz&quot;) müşterilerin ERP veritabanlarına Türkçe doğal dil arayüzü ve anomaly tespiti sağlayan bir SaaS uygulamasıdır. Bu politika KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) ve GDPR (EU 2016/679) uyumludur.',
    },
    {
      title: "2. Topladığımız veriler",
      list: [
        "Hesap bilgileri: ad, email, şifre (bcrypt hash)",
        "ERP bağlantı bilgileri: host, port, kullanıcı adı, şifre — AES-256-GCM ile şifrelenir",
        "Sohbet içeriği: kullanıcının doğal dil soruları, üretilen SQL sorguları, sonuç istatistikleri (satır sayısı, gecikme)",
        "Telemetri: hata kayıtları (Sentry), oturum/ziyaret kayıtları",
        "Bildirim: WhatsApp/email alıcı numaraları, push token (Expo)",
        "ERP veritabanı içeriği: yalnızca sorgu süresince işlenir, depolanmaz (tablo/kolon adları hariç — şema cache)",
      ],
    },
    {
      title: "3. Veri işleme amaçları",
      list: [
        "Hizmetin sunulması (SQL üretimi, sorgu çalıştırma, alert dağıtımı)",
        "Anomaly detection (saatlik/günlük cron işleri)",
        "Kalite iyileştirme (👍/👎 feedback ile model ayarı)",
        "Güvenlik (rate limit, fraud tespiti)",
        "Yasal yükümlülükler (vergi, denetim)",
      ],
    },
    {
      title: "4. Üçüncü taraflar (veri işleyici alt yükleniciler)",
      list: [
        "Anthropic (Claude AI) — SQL üretimi için soru + şema gönderilir, sonuç alınır",
        "Supabase (PostgreSQL hosting) — uygulama veritabanı, EU bölgesinde",
        "Vercel — uygulama hosting, EU/US bölgeleri",
        "Sentry — hata kayıtları, sensitive data scrubbing uygulanır",
        "Twilio — WhatsApp bildirimleri",
        "Expo (Google) — push notifications token relay",
        "GitHub — kaynak kod yönetimi (sadece geliştirme)",
      ],
      afterList: 'Üçüncü taraflar yalnızca hizmet sunumu için gerekli minimum veriyle çalışır, başka amaçla kullanmamayı taahhüt eder.<br/><br/>Güncel ve detaylı liste: <a href="/dpa" style="color:#0A0A0A;text-decoration:underline">/dpa</a> (alt-işleyici tablosu, GDPR Art. 28(2)).',
    },
    {
      title: "5. Veri saklama süreleri",
      list: [
        "Hesap verisi: hesap aktif olduğu sürece + silme talebinden 30 gün sonra",
        "Sohbet geçmişi: 12 ay (sonra otomatik silme)",
        "ERP kimlik bilgileri: hesap silinene kadar, şifrelenmiş",
        "Audit log: 24 ay (yasal yükümlülük)",
      ],
    },
    {
      title: "6. Haklarınız (KVKK md. 11 + GDPR md. 15-22)",
      list: [
        "Verilerinize erişim",
        "Düzeltme",
        "Silme (&quot;unutulma hakkı&quot;)",
        "İşlemenin sınırlandırılması",
        "Veri taşınabilirliği (JSON/CSV export)",
        "İşlemeye itiraz",
      ],
      afterList: 'Talepleriniz için: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a>',
    },
    {
      title: "7. Güvenlik önlemleri",
      list: [
        "Tüm trafik HTTPS (TLS 1.3)",
        "ERP şifreleri AES-256-GCM ile encrypted",
        "Veritabanı erişimi role-based, audit log'lu",
        "Penetrasyon testleri yıllık",
        "OWASP Top 10 güvenlik standartlarına uyum",
        "Tenant izolasyonu (cross-tenant veri sızıntısı önlenir)",
      ],
    },
    {
      title: "8. Çocukların gizliliği",
      body: "ERPAIO 18 yaş altına yönelik bir hizmet değildir. 18 yaş altındaki bir kişiden veri topladığımızı tespit edersek derhal sileriz.",
    },
    {
      title: "9. Politika değişiklikleri",
      body: "Bu politika güncellenebilir. Önemli değişiklikler email ile bildirilir, son güncelleme tarihi bu sayfada gösterilir.",
    },
    {
      title: "10. İletişim",
      body: 'Veri sorumlusu: <strong>ERPAIO</strong><br/>Email: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a><br/>Enterprise müşteri DPA (Veri İşleme Sözleşmesi) için: <a href="/dpa" style="color:#0A0A0A">/dpa</a>',
    },
  ],
};

const EN: { title: string; subtitle: string; sections: Sec[] } = {
  title: "Privacy Policy",
  subtitle: "Last updated: 2026-05-31",
  sections: [
    {
      title: "1. General",
      body: "ERPAIO (&quot;the service&quot;, &quot;we&quot;) is a SaaS application providing a Turkish natural-language interface and anomaly detection over Customer ERP databases. This policy is compliant with KVKK (Turkish Law No. 6698 on Protection of Personal Data) and GDPR (EU 2016/679).",
    },
    {
      title: "2. Data we collect",
      list: [
        "Account: name, email, password (bcrypt hash)",
        "ERP connection: host, port, username, password — encrypted with AES-256-GCM",
        "Chat content: natural-language questions, generated SQL, result statistics (row count, latency)",
        "Telemetry: error reports (Sentry), session/visit logs",
        "Notifications: WhatsApp/email recipient identifiers, push token (Expo)",
        "ERP database content: processed only for the duration of a query, not stored (except table/column names — schema cache)",
      ],
    },
    {
      title: "3. Purposes of processing",
      list: [
        "Delivery of the service (SQL generation, query execution, alert dispatch)",
        "Anomaly detection (hourly/daily cron jobs)",
        "Quality improvement (👍/👎 feedback for model tuning)",
        "Security (rate limiting, fraud detection)",
        "Legal compliance (tax, audit)",
      ],
    },
    {
      title: "4. Third parties (sub-processors)",
      list: [
        "Anthropic (Claude AI) — question + schema sent for SQL generation, result returned",
        "Supabase (PostgreSQL hosting) — application database, EU region",
        "Vercel — application hosting, EU/US regions",
        "Sentry — error reports with sensitive data scrubbing applied",
        "Twilio — WhatsApp notifications",
        "Expo (Google) — push notifications token relay",
        "GitHub — source code management (development only)",
      ],
      afterList: 'Third parties operate only on the minimum data required for service delivery and undertake not to use it for any other purpose.<br/><br/>Current and detailed list: <a href="/dpa?lang=en" style="color:#0A0A0A;text-decoration:underline">/dpa</a> (sub-processor table per GDPR Art. 28(2)).',
    },
    {
      title: "5. Data retention",
      list: [
        "Account data: while the account is active + 30 days after deletion request",
        "Chat history: 12 months (then auto-deleted)",
        "ERP credentials: until account deletion, encrypted",
        "Audit log: 24 months (statutory obligation)",
      ],
    },
    {
      title: "6. Your rights (KVKK Art. 11 + GDPR Art. 15-22)",
      list: [
        "Access to your data",
        "Rectification",
        "Erasure (&quot;right to be forgotten&quot;)",
        "Restriction of processing",
        "Data portability (JSON/CSV export)",
        "Objection to processing",
      ],
      afterList: 'Requests: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a>',
    },
    {
      title: "7. Security measures",
      list: [
        "All traffic HTTPS (TLS 1.3)",
        "ERP passwords encrypted with AES-256-GCM",
        "Database access role-based, audit-logged",
        "Annual penetration tests",
        "Compliance with OWASP Top 10",
        "Tenant isolation (cross-tenant data leak prevention)",
      ],
    },
    {
      title: "8. Children's privacy",
      body: "ERPAIO is not directed at users under 18. If we discover that we have collected data from a person under 18 we will delete it immediately.",
    },
    {
      title: "9. Policy changes",
      body: "This policy may be updated. Material changes are notified by email; the last-updated date is shown on this page.",
    },
    {
      title: "10. Contact",
      body: 'Data controller: <strong>ERPAIO</strong><br/>Email: <a href="mailto:privacy@erpaio.com" style="color:#0A0A0A">privacy@erpaio.com</a><br/>For the enterprise customer DPA (Data Processing Agreement): <a href="/dpa?lang=en" style="color:#0A0A0A">/dpa</a>',
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

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 18, margin: "8px 0" }}>
      {items.map((it) => <li key={it} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: it }} />)}
    </ul>
  );
}
