import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";

export const metadata = { title: "Changelog · ERPAIO" };

interface Release {
  version: string;
  date: string;
  type: "feature" | "fix" | "polish";
  title: string;
  items: string[];
}

const releases: Release[] = [
  {
    version: "1.5",
    date: "2026-05-04",
    type: "polish",
    title: "Tasarım sistemi tamamlandı",
    items: [
      "Toast notification sistemi + Confirm modal",
      "Cmd+K command palette (15 komut)",
      "Notification bell + alert badge",
      "Empty state component + skeleton loading",
      "Auth form'larda Mail/Lock/User iconları",
      "Pagination + filter pills",
      "Print CSS + skip links + reduced-motion",
      "Trust badges + customer logos placeholder",
    ],
  },
  {
    version: "1.4",
    date: "2026-05-03",
    type: "feature",
    title: "3 dil desteği + landing yenilendi",
    items: [
      "EN / TR / AR tam çeviri (RTL Arapça)",
      "Cookie-based middleware language routing",
      "Netlify referans tasarımı birebir",
      "Warm B&W tema (#FAFAF8/#0A0A0A)",
      "Inter + Playfair Display + JetBrains Mono",
      "Lucide icons (emoji yok)",
      "Responsive (mobile drawer, clamp typography)",
    ],
  },
  {
    version: "1.3",
    date: "2026-05-03",
    type: "feature",
    title: "Postgres ERP desteği + demo seed",
    items: [
      "MS SQL + PostgreSQL dual connector",
      "Türkçe perakende demo schema (kategori, magaza, urun, musteri, satis)",
      "500 ürün, 800 müşteri, 3000 satış random data",
    ],
  },
  {
    version: "1.2",
    date: "2026-05-03",
    type: "feature",
    title: "Pre-pilot güvenlik + KVKK paketi",
    items: [
      "Email verification flow",
      "Account lockout (5 deneme = 15dk lock)",
      "Active session yönetimi",
      "CSP + HSTS security headers",
      "Cookie consent banner",
      "Webhook retry (exponential backoff)",
      "KVKK data export (owner-only)",
      "Maintenance mode",
    ],
  },
  {
    version: "1.0–1.1",
    date: "2026-05-01",
    type: "feature",
    title: "Çekirdek SaaS özellikleri (Faza 0–28)",
    items: [
      "Multi-tenant + NextAuth v5",
      "ERP connector (Nebim V3)",
      "Anthropic Claude AI sorgu üretimi",
      "Anomaly detection (saatlik cron)",
      "Multi-channel notifications (WhatsApp/email/push/Slack)",
      "AES-256-GCM encryption + key rotation",
      "MFA, IP allowlist, audit log",
      "Forecasting + watchlists",
      "Mobile app (Expo) + Tauri desktop hazırlığı",
    ],
  },
];

const typeMeta: Record<Release["type"], { label: string; bg: string; fg: string }> = {
  feature: { label: "Özellik", bg: "#D1FAE5", fg: "#10B981" },
  fix: { label: "Düzeltme", bg: "#DBEAFE", fg: "#3B82F6" },
  polish: { label: "İyileştirme", bg: "#F2F1EE", fg: "#0A0A0A" },
};

export default function ChangelogPage() {
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

      <main id="main" style={{ maxWidth: 760, margin: "0 auto", padding: "60px 32px 80px" }}>
        <div style={{
          color: colors.brand,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          Changelog
        </div>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "clamp(36px, 5vw, 52px)",
          fontWeight: 400,
          letterSpacing: -1.5,
          margin: "0 0 16px",
          lineHeight: 1.1,
        }}>
          Yeni neler var?
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 17, lineHeight: 1.6, marginBottom: 56, maxWidth: 560 }}>
          Sürüm sürüm geliştirmeler, yeni özellikler, düzeltmeler. Tüm değişiklikler ve sürümler
          burada şeffafça listelenir.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {releases.map((r) => {
            const t = typeMeta[r.type];
            return (
              <article key={r.version} className="elevated" style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: 28,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    fontSize: 28,
                    fontWeight: 400,
                    letterSpacing: -1,
                    color: colors.text,
                  }}>
                    v{r.version}
                  </div>
                  <span style={{
                    background: t.bg,
                    color: t.fg,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}>
                    {t.label}
                  </span>
                  <span style={{ color: colors.textSubtle, fontSize: 13, marginLeft: "auto" }}>
                    {new Date(r.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 600, color: colors.text, margin: "0 0 16px" }}>
                  <Sparkles size={16} style={{ display: "inline", marginRight: 6, marginBottom: -2, color: colors.brand }} />
                  {r.title}
                </h3>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {r.items.map((item, i) => (
                    <li key={i} style={{
                      color: colors.textMuted,
                      fontSize: 14,
                      lineHeight: 1.6,
                      paddingLeft: 18,
                      position: "relative",
                    }}>
                      <span style={{ position: "absolute", left: 0, top: 8, width: 6, height: 6, borderRadius: 3, background: colors.text, opacity: 0.4 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
