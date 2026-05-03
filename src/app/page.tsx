import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  MessageSquare,
  AlertTriangle,
  Bell,
  GitBranch,
  Lightbulb,
  Network,
  PlayCircle,
  Sparkles,
  ArrowRight,
  Plug,
  Brain,
  Eye,
  Search,
  Workflow,
  TrendingUp,
  ShoppingBag,
  Factory,
  Wallet,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ScrollText,
  Lock,
} from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

const navItems = [
  { label: "Vizyon", href: "#vizyon" },
  { label: "Yetenekler", href: "#yetenekler" },
  { label: "Kullanım", href: "#kullanim" },
  { label: "Platform", href: "#platform" },
  { label: "Süreç", href: "#surec" },
  { label: "Güven", href: "#guven" },
  { label: "İletişim", href: "#iletisim" },
];

const stats = [
  { value: "$73B", label: "Global ERP Pazarı" },
  { value: "9", label: "Sektör Dikeyi" },
  { value: "0", label: "ERP Modifikasyonu" },
  { value: "7/24", label: "Proaktif İzleme" },
];

const capabilities = [
  { num: "01", Icon: Activity, title: "Sürekli İzleme", desc: "Tüm ERP modüllerinde kesintisiz görünürlük. Aktiviteler gerçek zamanlı izlenir, performans sürekli değerlendirilir, önemli olan ortaya çıkar." },
  { num: "02", Icon: MessageSquare, title: "Sürekli Geri Bildirim", desc: "Pozitif ve negatif performansı kapsayan AI üretimli operasyonel geri bildirim. Sürekli değerlendirme iyileştirmeleri ve sorunları birlikte gösterir." },
  { num: "03", Icon: AlertTriangle, title: "Tespit ve Sinyaller", desc: "Negatif sinyaller: anomaliler, riskler, verimsizlikler. Pozitif sinyaller: optimizasyonlar, fırsatlar. İstatistik ve ML destekli." },
  { num: "04", Icon: Bell, title: "Proaktif Bildirimler", desc: "Sistem önemli olayı sana söyler — sen aramıyorsun. WhatsApp, Telegram, email ile günlük özetler. Her uyarı detaylanır." },
  { num: "05", Icon: GitBranch, title: "Akış Farkındalığı", desc: "Geciken süreçler, tamamlanan operasyonlar, darboğazlar ve ivmelenmeler izlenir. Her iş akışı kontrol altında." },
  { num: "06", Icon: Lightbulb, title: "Reçete Öneriler", desc: "Kısıtlarınıza saygılı AI üretimli sipariş, stok dağılımı ve planlama önerileri. Senaryo simülasyonlu önceliklendirilmiş aksiyonlar." },
  { num: "07", Icon: Network, title: "Modüller Arası Zeka", desc: "Müşteri, tedarikçi, ürün ve lokasyon kimliklerini birleştiren bilgi grafiği. Semantik sorgular ve ilişki çıkarımı." },
  { num: "08", Icon: PlayCircle, title: "Karar ve İcra", desc: "Onay tabanlı iş akışı otomasyonu. ERP entegre aksiyonlar, audit log, geri alma planı, tam açıklanabilirlik." },
  { num: "09", Icon: Sparkles, title: "Konuşan ERP Asistanı", desc: "Düz dilde sor: 'Bugün neye odaklanmalıyım?' 'Ne ters gidiyor?' Text-to-SQL, RAG temelli, denetlenebilir." },
];

const useCases = [
  { Icon: ShoppingBag, title: "Perakende", desc: "Anormal satış düşüş veya yükselişlerini tespit edin. Fiyatlandırmada optimizasyon fırsatlarını yakalayın. Yavaş ve hızlı dönen stoklara dair bildirim alın." },
  { Icon: Factory, title: "Üretim", desc: "Üretim verimsizliği veya gecikmelerini tespit edin. Süreç iyileştirme fırsatlarını belirleyin. Tamamlanan ve geciken iş akışlarını izleyin." },
  { Icon: Wallet, title: "Finans", desc: "Olağandışı finansal hareketleri tespit edin. Pozitif trendleri ve optimizasyon alanlarını yakalayın. Geciken ödemeleri ve tamamlanan tahsilatları izleyin." },
];

const platformItems = [
  { Icon: MessageSquare, title: "Text → Code → Text", desc: "Doğal dilde soru → SQL → açıklamalı sonuç" },
  { Icon: Brain, title: "RAG + Tool Execution", desc: "Şema farkındalığı ve çağırılabilir araçlar" },
  { Icon: Plug, title: "Evrensel Konnektör", desc: "MS SQL, PostgreSQL, MySQL, Oracle, REST API" },
  { Icon: TrendingUp, title: "Üç Sütunlu Zeka", desc: "İzleme + Tespit + Aksiyon" },
];

const processSteps = [
  { num: "01", Icon: Plug, title: "Bağla", desc: "ERP'ye dokunmadan güvenli read-only entegrasyon. API pull, event streaming, CDC veya bulk export." },
  { num: "02", Icon: Brain, title: "Anla", desc: "AI tüm modüllerde semantik ve bağlamsal katman kurar. Birleşik bilgi grafiği, baseline, pattern ve mevsimsellik." },
  { num: "03", Icon: Eye, title: "İzle ve Bildir", desc: "Tüm aktivite kesintisiz izlenir. Sistem önemli olayı, riskleri, fırsatları, gecikmeleri proaktif bildirir." },
  { num: "04", Icon: Search, title: "Değerlendir ve Tespit Et", desc: "Anomalileri (negatif sinyal) ve optimizasyonları (pozitif sinyal) tespit eder. Modül-arası korelasyon, hız uyarıları, trend kırılması." },
  { num: "05", Icon: Workflow, title: "Öner ve Uygula", desc: "İçgörüler onay akışlı önerilen aksiyonlara dönüşür. Reçeteler taslak olarak çıkar. Audit log'lu ERP write-back." },
  { num: "06", Icon: TrendingUp, title: "Öğren ve Geliş", desc: "Sistem her sonuçtan öğrenir. Pozitif ve negatif geri bildirim karar kalitesini sürekli keskinleştirir. 7/24, her döngüde gelişiyor." },
];

const trustItems = [
  { Icon: Lock, title: "Read-Only Bağlantı" },
  { Icon: UserCheck, title: "Rol Tabanlı Erişim" },
  { Icon: CheckCircle2, title: "İnsan Onayı" },
  { Icon: ScrollText, title: "Tam Audit Logları" },
  { Icon: ShieldCheck, title: "Açıklanabilir AI" },
];

const sectionPad: React.CSSProperties = {
  padding: "100px 32px",
  maxWidth: 1100,
  margin: "0 auto",
};

const sectionH2: React.CSSProperties = {
  fontFamily: "var(--font-playfair), Georgia, serif",
  fontSize: "clamp(28px, 4.5vw, 52px)",
  fontWeight: 400,
  margin: "0 0 0",
  letterSpacing: -1,
  lineHeight: 1.15,
};

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div style={{ background: colors.bg, color: colors.text }}>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(250,250,248,0.88)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${colors.border}`,
        padding: "16px clamp(16px, 4vw, 48px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <Link href="/" aria-label="ERPAIO"><Logo size={32} /></Link>

        <nav className="hide-mobile" style={{ gap: 28, fontSize: 14, alignItems: "center", letterSpacing: 0.3 }}>
          {navItems.map((n) => (
            <a key={n.href} href={n.href} style={{ color: colors.textMuted, fontWeight: 400 }}>{n.label}</a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/login" style={{ color: colors.text, fontWeight: 500, fontSize: 14 }}>Giriş</Link>
          <Link href="/signup" style={pillBtnDark}>
            Başla <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        <section className="responsive-hero" style={{ padding: "120px 32px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            padding: "8px 18px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 500,
            marginBottom: 36,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: colors.brand }} />
            Kendi Kendini Geliştiren ERP AI
          </div>

          <h1 className="font-serif" style={{
            fontSize: "clamp(40px, 7vw, 80px)",
            lineHeight: 1.05,
            margin: "0 0 28px",
            fontWeight: 400,
            letterSpacing: -2,
            maxWidth: 880,
            color: colors.text,
          }}>
            ERP&apos;iniz için <em style={{ fontStyle: "italic", color: colors.brand }}>kendi kendini geliştiren</em> AI sistemi
          </h1>

          <p style={{
            fontSize: "clamp(15px, 1.7vw, 18px)",
            color: colors.textMuted,
            lineHeight: 1.75,
            marginBottom: 44,
            maxWidth: 580,
            fontWeight: 300,
          }}>
            Sistem işlerinizi sürekli izler, önemli olayı bildirir, sonuçtan öğrenir,
            içgörüleri kontrollü aksiyona dönüştürür — mevcut ERP&apos;nizi değiştirmeden.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 60, flexWrap: "wrap" }}>
            <a href="#iletisim" style={pillBtnDark}>
              Demo Talep Et <ArrowRight size={16} />
            </a>
            <a href="#surec" style={pillBtnGhost}>
              Nasıl Çalışır
            </a>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 24,
            paddingTop: 28,
            borderTop: `1px solid ${colors.border}`,
          }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: colors.text, letterSpacing: -1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="vizyon" className="responsive-section" style={{ background: colors.bgSubtle, padding: "80px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <SectionLabel>Çekirdek Fikir</SectionLabel>
            <h2 style={sectionH2}>Sürekli zeka döngüsü</h2>
            <p style={{ fontSize: "clamp(15px, 1.6vw, 17px)", color: colors.textMuted, lineHeight: 1.7, maxWidth: 800, marginTop: 20 }}>
              ERPAIO; izleme, geri bildirim, tespit, öneri ve aksiyon adımlarını tek bir sürekli döngüde
              birleştirir. Her döngüden öğrenir, kararlarını keskinleştirir. Mevcut ERP&apos;nize ek bir yük
              bindirmez — read-only bağlantıyla yan tarafta çalışır.
            </p>
          </div>
        </section>

        <section id="yetenekler" className="responsive-section" style={sectionPad}>
          <SectionLabel>Yetenekler</SectionLabel>
          <h2 style={sectionH2}>Dokuz çekirdek yetenek</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 40,
          }}>
            {capabilities.map((c) => (
              <div key={c.num} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: colors.brandSoft,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <c.Icon size={20} color={colors.brand} strokeWidth={2} />
                  </div>
                  <div style={{ color: colors.textSubtle, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{c.num}</div>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: colors.text, margin: "0 0 8px" }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="kullanim" className="responsive-section" style={{ background: colors.bgSubtle, padding: "100px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <SectionLabel>Kullanım Alanları</SectionLabel>
            <h2 style={sectionH2}>Sektör örnekleri</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginTop: 40,
            }}>
              {useCases.map((u) => (
                <div key={u.title} style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 28,
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    background: colors.brandSoft,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}>
                    <u.Icon size={24} color={colors.brand} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 12px" }}>{u.title}</h3>
                  <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="responsive-section" style={sectionPad}>
          <SectionLabel>Platform</SectionLabel>
          <h2 style={sectionH2}>Çekirdek bileşenler</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 40,
          }}>
            {platformItems.map((p) => (
              <div key={p.title} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: 24,
              }}>
                <p.Icon size={22} color={colors.brand} strokeWidth={2} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "16px 0 6px" }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="surec" className="responsive-section" style={{ background: colors.bgSubtle, padding: "100px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <SectionLabel>Süreç</SectionLabel>
            <h2 style={sectionH2}>Altı adımda kendini geliştiren zeka döngüsü</h2>
            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
              {processSteps.map((s) => (
                <div key={s.num} className="responsive-process-step" style={{
                  display: "flex",
                  gap: 20,
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 24,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 52,
                    minWidth: 52,
                    height: 52,
                    background: colors.brandSoft,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <s.Icon size={24} color={colors.brand} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <div style={{ color: colors.textSubtle, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{s.num}</div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{s.title}</h3>
                    </div>
                    <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="guven" className="responsive-section" style={sectionPad}>
          <SectionLabel>Kurumsal Güven</SectionLabel>
          <h2 style={sectionH2}>Güvenlik ve uyumluluk</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginTop: 40,
          }}>
            {trustItems.map((t) => (
              <div key={t.title} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 14,
              }}>
                <div style={{
                  width: 42,
                  height: 42,
                  background: colors.brandSoft,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <t.Icon size={20} color={colors.brand} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{t.title}</h3>
              </div>
            ))}
          </div>
        </section>

        <section id="iletisim" className="responsive-cta-bg" style={{ background: colors.bgDark, color: colors.textInverse, padding: "120px 32px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Logo size={48} variant="mark" />
            <h2 className="font-serif" style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 400,
              margin: "32px 0 20px",
              letterSpacing: -1,
              lineHeight: 1.15,
              color: "#FAFAF8",
            }}>
              Pilot başlatın
            </h2>
            <p style={{
              fontSize: "clamp(15px, 1.6vw, 17px)",
              color: "rgba(250,250,248,0.65)",
              lineHeight: 1.75,
              marginBottom: 44,
              fontWeight: 300,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              14 gün ücretsiz Pro deneme, kart bilgisi gerekmez.
              Veya bir gösterim ile süreç hakkında konuşalım.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup" style={{
                background: "#FAFAF8",
                color: "#0A0A0A",
                padding: "16px 36px",
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}>
                Ücretsiz başla <ArrowRight size={16} />
              </Link>
              <a href="mailto:demo@erpaio.com" style={{
                background: "transparent",
                color: "#FAFAF8",
                border: "1px solid rgba(250,250,248,0.3)",
                padding: "16px 36px",
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 400,
              }}>
                Demo iste
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="responsive-flex-col" style={{
        padding: "32px clamp(16px, 4vw, 32px)",
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
        color: colors.textSubtle,
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Logo size={20} />
          <span>© 2026 ERPAIO · İstanbul</span>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/pricing" style={{ color: colors.textSubtle }}>Fiyatlandırma</Link>
          <Link href="/privacy" style={{ color: colors.textSubtle }}>Gizlilik</Link>
          <Link href="/terms" style={{ color: colors.textSubtle }}>Koşullar</Link>
          <Link href="/login" style={{ color: colors.textSubtle }}>Giriş</Link>
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: colors.textSubtle,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

const pillBtnDark: React.CSSProperties = {
  background: colors.bgDark,
  color: colors.textInverse,
  padding: "14px 32px",
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const pillBtnGhost: React.CSSProperties = {
  background: "transparent",
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  padding: "14px 32px",
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 400,
  whiteSpace: "nowrap",
};
