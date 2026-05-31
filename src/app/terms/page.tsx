// Sprint F.9 — Terms of Service bilingual (TR + EN). Pattern identical
// to /dpa (F.7) and /privacy (F.8): cookie-based locale (erpaio_lang)
// with ?lang query override.

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
    ? { title: "Terms of Service · ERPAIO", description: "ERPAIO terms of service and conditions of use." }
    : { title: "Kullanım Koşulları · ERPAIO", description: "ERPAIO kullanım koşulları ve hizmet şartları." };
}

export default async function TermsPage({
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
            <Link href="/terms?lang=tr" style={{ color: locale === "tr" ? "#0A0A0A" : "#94A3B8", marginRight: 12 }}>TR</Link>
            <Link href="/terms?lang=en" style={{ color: locale === "en" ? "#0A0A0A" : "#94A3B8" }}>EN</Link>
          </div>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t.title}</h1>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 32 }}>{t.subtitle}</p>

        {t.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            {s.list ? (
              <>
                {s.beforeList && <div dangerouslySetInnerHTML={{ __html: s.beforeList }} />}
                <List items={s.list} />
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
  beforeList?: string;
  list?: string[];
}

const TR: { title: string; subtitle: string; sections: Sec[] } = {
  title: "Kullanım Koşulları",
  subtitle: "Son güncelleme: 2026-05-31",
  sections: [
    { title: "1. Hizmetin tanımı", body: "ERPAIO, müşterilerin ERP veritabanlarına Türkçe doğal dilde sorgu yapmasını ve anomaly tespiti almasını sağlayan bir SaaS uygulamasıdır. Hizmet web, iOS ve Android platformlarında sunulur." },
    { title: "2. Hesap ve sorumluluk", body: 'Hesap bilgilerinizin gizliliğinden siz sorumlusunuz. Hesabınız üzerinden gerçekleşen tüm işlemler size aittir. İzinsiz kullanım fark ederseniz derhal bildirin: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>' },
    {
      title: "3. Kabul edilebilir kullanım",
      beforeList: "Hizmeti aşağıdaki amaçlarla kullanmamayı kabul edersiniz:",
      list: ["Yasal olmayan faaliyetler", "Üçüncü tarafların haklarını ihlal", "Sistem güvenliğini delmek (SQL injection, prompt injection vb.)", "Aşırı yüklenme (rate limit aşımı)", "Tersine mühendislik veya yetkisiz veri çıkarma"],
    },
    { title: "4. AI üretimi içerik (sorumluluk reddi)", body: "ERPAIO AI&apos;ı (Claude) doğal dil sorgularını SQL&apos;e çevirir. AI üretimi sonuçlar her zaman %100 doğru olmayabilir. <strong>Kritik kararlar almadan önce sonuçları doğrulamanız gerekir.</strong> Yanlış SQL üretiminden veya buna dayalı kararlardan ERPAIO sorumlu tutulamaz." },
    { title: "5. Veri ve gizlilik", body: 'Veri işleme süreçleri için <a href="/privacy" style="color:#0A0A0A">Gizlilik Politikası</a> belgemize bakınız. ERP verileriniz tarafımızca depolanmaz, sadece sorgu süresince işlenir.' },
    { title: "6. Ödeme ve abonelik", body: "Plan ücretleri ve fatura döngüsü hesap ayarlarınızda gösterilir. Vade dolduğunda otomatik yenilenir, iptal edilebilir. İptal halinde son ödenen periyodun sonuna kadar erişim devam eder." },
    { title: "7. Hizmet kesintileri ve SLA", body: "%99.5 uptime hedefi (Vercel + Supabase altyapısı). Planlı bakım önceden bildirilir. Beklenmedik kesintiler için tazminat plana göre hesaplanır." },
    {
      title: "8. Sözleşmenin sona ermesi",
      beforeList: "Hesabınızı dilediğiniz zaman kapatabilirsiniz. Biz aşağıdaki durumlarda hesabınızı askıya alabilir veya kapatabiliriz:",
      list: ["Bu koşulların ihlali", "Yasal yükümlülük", "Ödeme yapılmaması (30 gün)", "Güvenlik ihlali şüphesi"],
    },
    { title: "9. Fikri mülkiyet", body: "ERPAIO&apos;nun yazılımı, prompt&apos;ları, AI modeli, ERP profile&apos;ları (Nebim, SAP vb. için hazırlanan bilgi tabanları) bizim fikri mülkiyetimizdir. Hizmeti kullanma hakkı verilir, sahiplik aktarılmaz." },
    { title: "10. Sorumluluk sınırı", body: "Toplam sorumluluğumuz, ihlal anından önceki 12 ay için ödediğiniz tutarla sınırlıdır. Dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz." },
    { title: "11. Değişiklikler", body: "Bu koşullar güncellenebilir. Önemli değişiklikler 30 gün öncesinden email ile bildirilir. Devam eden kullanım yeni koşulları kabul anlamına gelir." },
    { title: "12. Uygulanacak hukuk ve yetki", body: "Türkiye Cumhuriyeti hukuku uygulanır. İhtilaflar İstanbul Mahkemeleri&apos;nde görülür." },
    { title: "13. İletişim", body: 'Sorularınız için: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>' },
  ],
};

const EN: { title: string; subtitle: string; sections: Sec[] } = {
  title: "Terms of Service",
  subtitle: "Last updated: 2026-05-31",
  sections: [
    { title: "1. Description of the service", body: "ERPAIO is a SaaS application that lets customers query their ERP databases in Turkish natural language and receive anomaly detection. The service is offered on web, iOS, and Android." },
    { title: "2. Account and responsibility", body: 'You are responsible for the confidentiality of your account credentials. All activity under your account is attributable to you. Report unauthorized use immediately: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>' },
    {
      title: "3. Acceptable use",
      beforeList: "You agree not to use the service for:",
      list: ["Unlawful activities", "Infringing the rights of third parties", "Breaching system security (SQL injection, prompt injection, etc.)", "Excessive load (rate-limit abuse)", "Reverse engineering or unauthorized data extraction"],
    },
    { title: "4. AI-generated content (disclaimer)", body: "ERPAIO&apos;s AI (Claude) translates natural-language questions into SQL. AI-generated results may not always be 100% correct. <strong>You must verify results before making critical decisions.</strong> ERPAIO is not liable for incorrect SQL generation or decisions based thereon." },
    { title: "5. Data and privacy", body: 'For data-processing details, see our <a href="/privacy?lang=en" style="color:#0A0A0A">Privacy Policy</a>. Your ERP data is not stored by us — it is processed only for the duration of the query.' },
    { title: "6. Payment and subscription", body: "Plan fees and billing cycle are displayed in your account settings. Subscriptions auto-renew at term end and can be cancelled. On cancellation, access continues until the end of the paid period." },
    { title: "7. Service availability and SLA", body: "Target 99.5% uptime (Vercel + Supabase infrastructure). Planned maintenance is announced in advance. Compensation for unscheduled outages is calculated per plan." },
    {
      title: "8. Termination",
      beforeList: "You may close your account at any time. We may suspend or close your account in the following cases:",
      list: ["Breach of these terms", "Legal obligation", "Non-payment (30 days)", "Suspected security breach"],
    },
    { title: "9. Intellectual property", body: "ERPAIO&apos;s software, prompts, AI model, and ERP profiles (knowledge bases for Nebim, SAP, etc.) are our intellectual property. A right to use the service is granted; no ownership is transferred." },
    { title: "10. Limitation of liability", body: "Our total liability is limited to the amount you paid in the 12 months preceding the incident. We are not liable for indirect, incidental, or consequential damages." },
    { title: "11. Changes", body: "These terms may be updated. Material changes are notified by email 30 days in advance. Continued use constitutes acceptance of the updated terms." },
    { title: "12. Governing law and jurisdiction", body: "Turkish law governs this agreement. Disputes are heard in the courts of Istanbul, Turkey." },
    { title: "13. Contact", body: 'Questions: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>' },
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
