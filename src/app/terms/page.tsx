export const metadata = {
  title: "Kullanım Koşulları · ERPAIO",
  description: "ERPAIO kullanım koşulları ve hizmet şartları.",
};

export default function TermsPage() {
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
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Kullanım Koşulları</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 32 }}>Son güncelleme: 2026-05-03</p>

        <Section title="1. Hizmetin tanımı">
          ERPAIO, müşterilerin ERP veritabanlarına Türkçe doğal dilde sorgu yapmasını
          ve anomaly tespiti almasını sağlayan bir SaaS uygulamasıdır. Hizmet web,
          iOS ve Android platformlarında sunulur.
        </Section>

        <Section title="2. Hesap ve sorumluluk">
          Hesap bilgilerinizin gizliliğinden siz sorumlusunuz. Hesabınız üzerinden
          gerçekleşen tüm işlemler size aittir. İzinsiz kullanım fark ederseniz
          derhal bildirin: <a href="mailto:support@erpaio.com" style={{ color: "#0A0A0A" }}>support@erpaio.com</a>
        </Section>

        <Section title="3. Kabul edilebilir kullanım">
          Hizmeti aşağıdaki amaçlarla kullanmamayı kabul edersiniz:
          <List items={[
            "Yasal olmayan faaliyetler",
            "Üçüncü tarafların haklarını ihlal",
            "Sistem güvenliğini delmek (SQL injection, prompt injection vb.)",
            "Aşırı yüklenme (rate limit aşımı)",
            "Tersine mühendislik veya yetkisiz veri çıkarma",
          ]} />
        </Section>

        <Section title="4. AI üretimi içerik (sorumluluk reddi)">
          ERPAIO AI&apos;ı (Claude) doğal dil sorgularını SQL&apos;e çevirir. AI üretimi
          sonuçlar her zaman %100 doğru olmayabilir. <strong>Kritik kararlar
          almadan önce sonuçları doğrulamanız gerekir.</strong> Yanlış SQL üretiminden
          veya buna dayalı kararlardan ERPAIO sorumlu tutulamaz.
        </Section>

        <Section title="5. Veri ve gizlilik">
          Veri işleme süreçleri için <a href="/privacy" style={{ color: "#0A0A0A" }}>Gizlilik Politikası</a>
          {" "}belgemize bakınız. ERP verileriniz tarafımızca depolanmaz, sadece
          sorgu süresince işlenir.
        </Section>

        <Section title="6. Ödeme ve abonelik">
          Plan ücretleri ve fatura döngüsü hesap ayarlarınızda gösterilir.
          Vade dolduğunda otomatik yenilenir, iptal edilebilir. İptal halinde
          son ödenen periyodun sonuna kadar erişim devam eder.
        </Section>

        <Section title="7. Hizmet kesintileri ve SLA">
          %99.5 uptime hedefi (Vercel + Supabase altyapısı). Planlı bakım
          önceden bildirilir. Beklenmedik kesintiler için tazminat plana
          göre hesaplanır.
        </Section>

        <Section title="8. Sözleşmenin sona ermesi">
          Hesabınızı dilediğiniz zaman kapatabilirsiniz. Biz aşağıdaki durumlarda
          hesabınızı askıya alabilir veya kapatabiliriz:
          <List items={[
            "Bu koşulların ihlali",
            "Yasal yükümlülük",
            "Ödeme yapılmaması (30 gün)",
            "Güvenlik ihlali şüphesi",
          ]} />
        </Section>

        <Section title="9. Fikri mülkiyet">
          ERPAIO&apos;nun yazılımı, prompt&apos;ları, AI modeli, ERP profile&apos;ları (Nebim, SAP vb.
          için hazırlanan bilgi tabanları) bizim fikri mülkiyetimizdir. Hizmeti
          kullanma hakkı verilir, sahiplik aktarılmaz.
        </Section>

        <Section title="10. Sorumluluk sınırı">
          Toplam sorumluluğumuz, ihlal anından önceki 12 ay için ödediğiniz tutarla
          sınırlıdır. Dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz.
        </Section>

        <Section title="11. Değişiklikler">
          Bu koşullar güncellenebilir. Önemli değişiklikler 30 gün öncesinden email ile
          bildirilir. Devam eden kullanım yeni koşulları kabul anlamına gelir.
        </Section>

        <Section title="12. Uygulanacak hukuk ve yetki">
          Türkiye Cumhuriyeti hukuku uygulanır. İhtilaflar İstanbul Mahkemeleri&apos;nde
          görülür.
        </Section>

        <Section title="13. İletişim">
          Sorularınız için: <a href="mailto:support@erpaio.com" style={{ color: "#0A0A0A" }}>support@erpaio.com</a>
        </Section>
      </div>
    </div>
  );
}

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
