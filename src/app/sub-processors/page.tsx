export const metadata = {
  title: "Alt Yükleniciler · ERPAIO",
  description:
    "ERPAIO veri işleyici alt yüklenicileri (sub-processors) — GDPR Art. 28(2) + KVKK md. 9 uyumlu açıklama.",
};

// Sprint E.1 — GDPR Art. 28(2) requires controllers to publish a current list
// of sub-processors and notify customers before adding/changing them. This
// page is the canonical source; privacy/page.tsx links here.

interface Subprocessor {
  name: string;
  service: string;
  dataShared: string;
  region: string;
  dpa: string;
}

const SUBPROCESSORS: Subprocessor[] = [
  {
    name: "Anthropic, PBC",
    service: "Claude AI (SQL generation, anomaly summarization)",
    dataShared:
      "Doğal dil sorusu + ERP şema bağlamı + örnek satırlar. Sonuç olarak SQL ve açıklama döner. Müşteri ERP içeriği saklanmaz.",
    region: "ABD",
    dpa: "https://www.anthropic.com/legal/dpa",
  },
  {
    name: "Supabase Inc.",
    service: "PostgreSQL hosting (uygulama veritabanı + auth)",
    dataShared:
      "Tüm uygulama verisi: hesap, tenant, alert, audit log. ERP şifreleri AES-256-GCM ile şifrelidir.",
    region: "AB (Frankfurt / Dublin)",
    dpa: "https://supabase.com/legal/dpa",
  },
  {
    name: "Vercel Inc.",
    service: "Uygulama hosting + CDN + serverless function execution",
    dataShared:
      "HTTP istek/yanıt metadata, kullanıcı oturum cookie'leri, geçici log'lar (≤24 saat).",
    region: "AB / ABD (multi-region)",
    dpa: "https://vercel.com/legal/dpa",
  },
  {
    name: "Sentry (Functional Software, Inc.)",
    service: "Hata izleme + performans telemetrisi",
    dataShared:
      "Stack trace, request URL, kullanıcı ID. Sensitive scrubbing aktif (email/şifre/token mask edilir).",
    region: "ABD (EU veri saklama opsiyonel)",
    dpa: "https://sentry.io/legal/dpa/",
  },
  {
    name: "Twilio Inc.",
    service: "WhatsApp Business API üzerinden alert bildirimi",
    dataShared:
      "Alıcı WhatsApp numarası + bildirim metni (alert başlığı + kısa özet). ERP içerik gönderilmez.",
    region: "ABD (AB veri yolları mevcut)",
    dpa: "https://www.twilio.com/legal/data-protection-addendum",
  },
  {
    name: "Resend (Resend Inc.)",
    service: "Transactional email (verification, password reset, alerts)",
    dataShared:
      "Alıcı email adresi + mesaj içeriği. Send/deliver/bounce metrikleri tutulur.",
    region: "ABD",
    dpa: "https://resend.com/legal/dpa",
  },
  {
    name: "Upstash Inc.",
    service: "Rate-limit storage (Redis-compatible KV)",
    dataShared:
      "IP adresi + endpoint counter (TTL 1 saat). Kişisel veri uzun süreli saklanmaz.",
    region: "AB / ABD",
    dpa: "https://upstash.com/static/trust/dpa.pdf",
  },
  {
    name: "Expo (650 Industries, Inc.)",
    service: "Mobile push notification token relay",
    dataShared:
      "Cihaz push token + bildirim payload. Token-to-user eşleştirme bizim DB'mizde.",
    region: "ABD",
    dpa: "https://expo.dev/legal/dpa",
  },
  {
    name: "Stripe Inc.",
    service: "Faturalama + abonelik yönetimi (uluslararası müşteriler için)",
    dataShared:
      "Tenant kimliği, plan, ödeme tutarı. Kart bilgisi yalnızca Stripe'a gider, biz tutmayız.",
    region: "ABD (PCI-DSS Level 1)",
    dpa: "https://stripe.com/legal/dpa",
  },
  {
    name: "iyzico (PayU Türkiye)",
    service: "Türkiye'de TL bazlı abonelik faturalama",
    dataShared:
      "Tenant kimliği, plan, TC/VKN (opsiyonel), kart bilgisi yalnızca iyzico'da. BDDK lisanslı.",
    region: "Türkiye",
    dpa: "https://www.iyzico.com/sozlesmeler",
  },
];

export default function SubProcessorsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        color: "#0F172A",
        fontFamily: "inherit",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
          ERPAIO
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Alt Yükleniciler / Sub-processors</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 32 }}>
          Son güncelleme: 2026-05-31
        </p>

        <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          ERPAIO hizmetini sunmak için aşağıdaki üçüncü taraf veri işleyicileri (KVKK md. 9 — yurt
          dışı aktarım / GDPR Art. 28(2) — sub-processors) kullanır. Bu liste değişirse en az 30
          gün önce müşterilere email ile bildirim yapılır. İtirazı olan müşteri sözleşmesini
          feshetme hakkına sahiptir.
        </p>

        <div
          role="table"
          aria-label="Sub-processors list"
          style={{
            display: "grid",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {SUBPROCESSORS.map((sp) => (
            <article
              key={sp.name}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ fontSize: 14, color: "#0A0A0A", margin: 0 }}>{sp.name}</h2>
                <span
                  style={{
                    fontSize: 10,
                    color: "#94A3B8",
                    background: "#F1F5F9",
                    padding: "2px 8px",
                    borderRadius: 100,
                    fontFamily: "ui-monospace, Menlo, monospace",
                  }}
                >
                  {sp.region}
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>
                <strong>Hizmet / Service:</strong> {sp.service}
              </div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>
                <strong>Paylaşılan veri / Data shared:</strong> {sp.dataShared}
              </div>
              <a
                href={sp.dpa}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: "#0A0A0A",
                  textDecoration: "underline",
                  display: "inline-block",
                  marginTop: 4,
                }}
              >
                DPA / Sözleşme →
              </a>
            </article>
          ))}
        </div>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, color: "#0A0A0A", marginBottom: 12 }}>İletişim / Contact</h2>
          <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.7 }}>
            Yeni alt yükleniciye itiraz veya soru için:{" "}
            <a href="mailto:privacy@erpaio.com" style={{ color: "#0A0A0A" }}>
              privacy@erpaio.com
            </a>
          </div>
        </section>

        <p style={{ color: "#94A3B8", fontSize: 11, lineHeight: 1.6 }}>
          Bu liste{" "}
          <a href="/privacy" style={{ color: "#0A0A0A" }}>
            Gizlilik Politikası
          </a>{" "}
          ile birlikte değerlendirilmelidir.
        </p>
      </div>
    </div>
  );
}
