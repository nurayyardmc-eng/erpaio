export const metadata = {
  title: "Gizlilik Politikası · ERPAIO",
  description: "ERPAIO gizlilik politikası — KVKK + GDPR uyumlu.",
};

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090F",
      color: "#E8EDF5",
      fontFamily: "monospace",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ color: "#00E5FF", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Gizlilik Politikası</h1>
        <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 32 }}>Son güncelleme: 2026-05-03</p>

        <Section title="1. Genel">
          ERPAIO ("hizmet", "biz") müşterilerin ERP veritabanlarına Türkçe doğal dil
          arayüzü ve anomaly tespiti sağlayan bir SaaS uygulamasıdır. Bu politika
          KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) ve GDPR (EU 2016/679)
          uyumludur.
        </Section>

        <Section title="2. Topladığımız veriler">
          <List items={[
            "Hesap bilgileri: ad, email, şifre (bcrypt hash)",
            "ERP bağlantı bilgileri: host, port, kullanıcı adı, şifre — AES-256-GCM ile şifrelenir",
            "Sohbet içeriği: kullanıcının doğal dil soruları, üretilen SQL sorguları, sonuç istatistikleri (satır sayısı, gecikme)",
            "Telemetri: hata kayıtları (Sentry), oturum/ziyaret kayıtları",
            "Bildirim: WhatsApp/email alıcı numaraları, push token (Expo)",
            "ERP veritabanı içeriği: yalnızca sorgu süresince işlenir, depolanmaz (tablo/kolon adları hariç — şema cache)",
          ]} />
        </Section>

        <Section title="3. Veri işleme amaçları">
          <List items={[
            "Hizmetin sunulması (SQL üretimi, sorgu çalıştırma, alert dağıtımı)",
            "Anomaly detection (saatlik/günlük cron işleri)",
            "Kalite iyileştirme (👍/👎 feedback ile model ayarı)",
            "Güvenlik (rate limit, fraud tespiti)",
            "Yasal yükümlülükler (vergi, denetim)",
          ]} />
        </Section>

        <Section title="4. Üçüncü taraflar (veri işleyici alt yükleniciler)">
          <List items={[
            "Anthropic (Claude AI) — SQL üretimi için soru + şema gönderilir, sonuç alınır",
            "Supabase (PostgreSQL hosting) — uygulama veritabanı, EU bölgesinde",
            "Vercel — uygulama hosting, EU/US bölgeleri",
            "Sentry — hata kayıtları, sensitive data scrubbing uygulanır",
            "Twilio — WhatsApp bildirimleri",
            "Expo (Google) — push notifications token relay",
            "GitHub — kaynak kod yönetimi (sadece geliştirme)",
          ]} />
          Üçüncü taraflar yalnızca hizmet sunumu için gerekli minimum veriyle çalışır,
          başka amaçla kullanmamayı taahhüt eder.
        </Section>

        <Section title="5. Veri saklama süreleri">
          <List items={[
            "Hesap verisi: hesap aktif olduğu sürece + silme talebinden 30 gün sonra",
            "Sohbet geçmişi: 12 ay (sonra otomatik silme)",
            "ERP kimlik bilgileri: hesap silinene kadar, şifrelenmiş",
            "Audit log: 24 ay (yasal yükümlülük)",
          ]} />
        </Section>

        <Section title="6. Haklarınız (KVKK md. 11 + GDPR md. 15-22)">
          <List items={[
            "Verilerinize erişim",
            "Düzeltme",
            "Silme (\"unutulma hakkı\")",
            "İşlemenin sınırlandırılması",
            "Veri taşınabilirliği (JSON/CSV export)",
            "İşlemeye itiraz",
          ]} />
          Talepleriniz için: <a href="mailto:privacy@erpaio.com" style={{ color: "#00E5FF" }}>privacy@erpaio.com</a>
        </Section>

        <Section title="7. Güvenlik önlemleri">
          <List items={[
            "Tüm trafik HTTPS (TLS 1.3)",
            "ERP şifreleri AES-256-GCM ile encrypted",
            "Veritabanı erişimi role-based, audit log'lu",
            "Penetrasyon testleri yıllık",
            "OWASP Top 10 güvenlik standartlarına uyum",
            "Tenant izolasyonu (cross-tenant veri sızıntısı önlenir)",
          ]} />
        </Section>

        <Section title="8. Çocukların gizliliği">
          ERPAIO 18 yaş altına yönelik bir hizmet değildir. 18 yaş altındaki bir kişiden
          veri topladığımızı tespit edersek derhal sileriz.
        </Section>

        <Section title="9. Politika değişiklikleri">
          Bu politika güncellenebilir. Önemli değişiklikler email ile bildirilir,
          son güncelleme tarihi bu sayfada gösterilir.
        </Section>

        <Section title="10. İletişim">
          Veri sorumlusu: <strong>ERPAIO</strong>
          <br />Email: <a href="mailto:privacy@erpaio.com" style={{ color: "#00E5FF" }}>privacy@erpaio.com</a>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, color: "#00E5FF", marginBottom: 12 }}>{title}</h2>
      <div style={{ color: "#9AA5B4", fontSize: 12, lineHeight: 1.7 }}>{children}</div>
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
