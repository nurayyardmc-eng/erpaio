// Sprint F.4 — Data Processing Agreement template (KVKK md. 12 + GDPR Art. 28).
//
// Bu sayfa enterprise satış sürecinde Müşteri (Veri Sorumlusu) ile imzalanacak
// DPA'nın kamuya açık şablonudur. Asıl bağlayıcı versiyon PDF olarak ayrıca
// imzalatılır. Sayfa şablonu privacy/terms ile aynı görsel dilde tutulur.

import Link from "next/link";

export const metadata = {
  title: "Veri İşleme Sözleşmesi (DPA) · ERPAIO",
  description: "KVKK + GDPR uyumlu Veri İşleme Sözleşmesi şablonu.",
};

export default function DpaPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      color: "#0F172A",
      fontFamily: "inherit",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Veri İşleme Sözleşmesi (DPA)</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24 }}>
          v1.0-draft · Son güncelleme: 2026-05-31
        </p>

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
          <strong>Bu sayfa şablondur.</strong> Enterprise müşteri ile bağlayıcı versiyon ayrı PDF olarak hazırlanır ve avukat onayından geçer.
          DPA talep etmek için <a href="mailto:legal@erpaio.com" style={{ color: "#92400E", textDecoration: "underline" }}>legal@erpaio.com</a> adresine yazınız.
        </div>

        <Section title="0. Taraflar">
          <strong>Veri Sorumlusu</strong> (&quot;Müşteri&quot;): bu sözleşmeye taraf olan tüzel kişi.<br />
          <strong>Veri İşleyen</strong> (&quot;ERPAIO&quot;): bu hizmeti sunan tüzel kişi.<br /><br />
          Müşteri, KVKK md. 3/ı ve GDPR Art. 4(7) anlamında <strong>veri sorumlusudur</strong>; ERPAIO,
          KVKK md. 3/ğ ve GDPR Art. 4(8) anlamında <strong>veri işleyendir</strong>.
        </Section>

        <Section title="1. Konu ve süre">
          ERPAIO; Müşterinin Türkçe doğal dil arayüzü üzerinden kendi ERP veritabanına sorgu yapmasını,
          anomaly tespiti ve bildirim almasını sağlayan bir SaaS hizmeti sunar. Bu DPA, ana hizmet sözleşmesinin
          (MSA) eki olarak Müşteri ile ERPAIO arasındaki kişisel veri işleme ilişkisini düzenler.
          Süre, ana hizmet sözleşmesi süresi ile aynıdır.
        </Section>

        <Section title="2. İşlenen veri kategorileri">
          Müşterinin hizmet üzerinden ERPAIO&apos;ya aktardığı veriler:
          <List items={[
            "Hesap verisi: kullanıcı adı, e-posta, hashlenmiş şifre (bcrypt), oturum tokenları, MFA secret.",
            "ERP bağlantı verisi: host, port, veritabanı adı, kullanıcı adı, AES-256-GCM ile şifrelenmiş parola.",
            "Sorgu içeriği: doğal dil soruları, üretilen SQL, sonuçların ilk 100 satırı (önbellek için).",
            "Aktivite kayıtları: giriş/çıkış, IP, user-agent, hesap işlem logları.",
            "Bildirim metadata'sı: WhatsApp/email/Slack/Teams gönderim sonuçları ve alıcı bilgisi.",
          ]} />
          Özel nitelikli kişisel veri (sağlık, biyometri, mahkumiyet vb.) toplanmaz.
        </Section>

        <Section title="3. İşleme amacı ve hukuki dayanak">
          ERPAIO, kişisel verileri yalnızca Müşterinin <strong>yazılı talimatı doğrultusunda</strong> ve
          aşağıdaki amaçlarla işler:
          <List items={[
            "Hizmetin sözleşme kapsamında sunulması.",
            "Hizmetin güvenliği, kullanılabilirliği ve kalitesinin sağlanması.",
            "Faturalandırma, müşteri desteği ve yasal yükümlülükler.",
          ]} />
          ERPAIO, verileri kendi pazarlama, satış veya profilleme amacıyla <strong>işlemez</strong>.
        </Section>

        <Section title="4. Veri işleyenin yükümlülükleri">
          <List items={[
            "Verileri yalnızca bu DPA ve Müşterinin yazılı talimatları doğrultusunda işlemek.",
            "Verilere erişen personelin yazılı gizlilik taahhütü vermesini sağlamak.",
            "Madde 7'deki teknik ve organizasyonel önlemleri uygulamak.",
            "Alt-işleyici görevlendirme öncesinde 14 gün önceden bildirimde bulunmak.",
            "Veri sahibi hakları talepleri için gerekli API/UI'ı sağlamak.",
            "Veri ihlali tespitinden itibaren 72 saat içinde Müşteriye bildirimde bulunmak (GDPR Art. 33).",
            "Denetim otoritesine işbirliği yapmak.",
          ]} />
        </Section>

        <Section title="5. Alt-işleyiciler (sub-processors)">
          Mevcut alt-işleyiciler:
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["Hizmet", "Konum", "Amaç"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#0A0A0A", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((sp) => (
                  <tr key={sp.name} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "6px 10px", color: "#0F172A" }}>{sp.name}</td>
                    <td style={{ padding: "6px 10px", color: "#475569" }}>{sp.location}</td>
                    <td style={{ padding: "6px 10px", color: "#475569" }}>{sp.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>
            Yeni alt-işleyici eklenmeden <strong>14 gün</strong> önce Müşteriye e-posta ile bildirimde bulunulur.
          </p>
        </Section>

        <Section title="6. Uluslararası veri transferi">
          ABD&apos;de işlenen veriler için <strong>AB Standart Sözleşme Maddeleri</strong> (SCC 2021/914) uygulanır.
          KVKK md. 9 kapsamında Türkiye&apos;den çıkışlar için ilgili kişiden açık rıza alınır;
          signup KVKK onayı <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>consent_log</code> tablosunda audit edilir.
        </Section>

        <Section title="7. Teknik ve organizasyonel önlemler">
          <strong>Şifreleme:</strong>
          <List items={[
            "ERP bağlantı parolaları: AES-256-GCM, anahtar rotasyonu desteklenir.",
            "Bekleme verisi: Supabase varsayılan disk şifrelemesi (AES-256).",
            "İletim verisi: TLS 1.2+, HSTS aktif.",
            "Kullanıcı şifreleri: bcrypt cost factor 12.",
          ]} />
          <strong>Erişim kontrolü:</strong>
          <List items={[
            "Multi-tenant izolasyon: her sorguda tenantId boundary.",
            "Role-based access: owner / member / sysadmin.",
            "MFA: TOTP destekli, sysadmin için zorunlu.",
            "Read-only ERP koruması: 50+ test ile SELECT-only validator.",
          ]} />
          <strong>İş sürekliliği:</strong>
          <List items={[
            "Haftalık otomatik DB yedeklemesi (pg_dump, 30 gün retention).",
            "Sentry ile gerçek zamanlı hata takibi.",
            "Health endpoint (/api/health) ile uptime izleme.",
          ]} />
        </Section>

        <Section title="8. Veri sahibi hakları">
          <List items={[
            "Erişim/taşınabilirlik: /dashboard/settings → Veri export (JSON+JSONL).",
            "Silme: /dashboard/settings → DangerZone → Hesabı sil (cascade).",
            "Düzeltme: profil sayfasından doğrudan düzenleme.",
            "İşlemenin sınırlandırılması: destek talebi üzerine.",
          ]} />
        </Section>

        <Section title="9. Sözleşme sonu">
          Sözleşmenin sona ermesi halinde Müşteri, <strong>30 gün içinde</strong> verilerinin
          (a) tam bir export&apos;unu indirebilir, (b) silinmesini talep edebilir.
          30 günlük geçiş süresinin sonunda ERPAIO Müşteri verilerini kalıcı olarak siler
          (en geç 60 gün içinde tüm yedek kopyalar dahil). Audit logları (ActivityLog, ConsentLog)
          yasal retention gereği 2 yıl saklanır.
        </Section>

        <Section title="10. Denetim">
          Müşteri, yılda <strong>bir defaya</strong> mahsus olmak üzere bu DPA&apos;ya uyumu denetleme hakkına sahiptir.
          ERPAIO ISO 27001 veya SOC 2 sertifikası aldığında bu raporlar denetim yerine geçer.
        </Section>

        <Section title="11. İletişim">
          DPA imzalatma ve hukuki konular için: <a href="mailto:legal@erpaio.com" style={{ color: "#0A0A0A" }}>legal@erpaio.com</a>
          <br />Veri ihlali bildirim: <a href="mailto:privacy@erpaio.com" style={{ color: "#0A0A0A" }}>privacy@erpaio.com</a>
          <br />Genel destek: <a href="mailto:support@erpaio.com" style={{ color: "#0A0A0A" }}>support@erpaio.com</a>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E5E7EB", fontSize: 11, color: "#94A3B8" }}>
          İlgili: <Link href="/privacy" style={{ color: "#475569" }}>Gizlilik Politikası</Link>
          {" · "}
          <Link href="/terms" style={{ color: "#475569" }}>Kullanım Şartları</Link>
        </div>
      </div>
    </div>
  );
}

const SUB_PROCESSORS = [
  { name: "Vercel, Inc.", location: "ABD (SCC)", purpose: "Uygulama hosting (Next.js)" },
  { name: "Supabase, Inc.", location: "EU (Frankfurt)", purpose: "Postgres veritabanı" },
  { name: "Anthropic, PBC", location: "ABD (DPA)", purpose: "Claude AI sorgu üretimi" },
  { name: "Twilio, Inc.", location: "ABD (SCC)", purpose: "WhatsApp bildirim" },
  { name: "Resend, Inc.", location: "ABD (DPA)", purpose: "Email bildirim" },
  { name: "Upstash, Inc.", location: "EU (Frankfurt)", purpose: "Redis rate-limit" },
  { name: "Sentry (Functional Software)", location: "ABD (SCC)", purpose: "Hata raporlama" },
  { name: "Stripe, Inc.", location: "İrlanda + ABD", purpose: "Global ödeme (TR dışı)" },
  { name: "iyzico Ödeme Hizmetleri A.Ş.", location: "Türkiye", purpose: "TR ödeme" },
  { name: "GitHub, Inc.", location: "ABD (DPA)", purpose: "CI/CD + cron" },
];

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
      {items.map((it) => <li key={it} style={{ marginBottom: 4 }}>{it}</li>)}
    </ul>
  );
}
