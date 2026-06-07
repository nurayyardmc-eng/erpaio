// Sprint F.5b — SSR landing page (EN-only side-by-side with static
// /landing.html for visual diff).
// Sprint F.5c — extended to TR + AR via locale catalogs + cookie-based
// resolver (?lang query overrides erpaio_lang cookie). HTML title slots
// use dangerouslySetInnerHTML so each locale expresses word order
// naturally with its own <em> / <br/> markup. Content is from typed
// catalog constants — no user input — so dangerouslySetInnerHTML is safe.
//
// Mounted at /landing-ssr — does NOT intercept /landing.html yet. F.5d
// will switch the middleware once visual parity is verified.

import { cookies } from "next/headers";
import { EN, type LandingContent } from "@/lib/landing/content";
import { TR } from "@/lib/landing/contentTr";
import { AR } from "@/lib/landing/contentAr";
import { resolveLocale, type Locale } from "@/lib/landing/locale";
import { LandingInteractive } from "./LandingInteractive";
import { EnterpriseTrust } from "@/components/landing/EnterpriseTrust";
import { AiDemoPreview } from "@/components/landing/AiDemoPreview";
import { AnalyticsDashboard } from "@/components/landing/AnalyticsDashboard";
import { DataConnection } from "@/components/landing/DataConnection";
import { DemoRequest } from "@/components/landing/DemoRequest";
import { LandingErrorBoundary } from "@/components/landing/LandingErrorBoundary";

const CATALOGS: Record<Locale, LandingContent> = { en: EN, tr: TR, ar: AR };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(params.lang, cookieStore.get("erpaio_lang")?.value);
  const t = CATALOGS[locale];

  // Gözden Kaçanlar — locale-aware OpenGraph + Twitter + hreflang for the
  // SSR landing (previously only title + description). Brand/SEO: share
  // cards now render the correct per-locale title/description and language.
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";
  const ogLocale = locale === "tr" ? "tr_TR" : locale === "ar" ? "ar_SA" : "en_US";
  const ogImage = { url: `${baseUrl}/logo.png`, width: 1254, height: 1254, alt: "ERPAIO" };

  return {
    // absolute → bypass the root layout's "%s | ERPAIO" template so the
    // tab title isn't "ERPAIO — … | ERPAIO" (ERPAIO twice).
    title: { absolute: t.metaTitle },
    description: t.metaDesc,
    alternates: {
      canonical: baseUrl,
      languages: {
        tr: `${baseUrl}/?lang=tr`,
        en: `${baseUrl}/?lang=en`,
        ar: `${baseUrl}/?lang=ar`,
      },
    },
    openGraph: {
      type: "website",
      url: baseUrl,
      siteName: "ERPAIO",
      title: t.metaTitle,
      description: t.metaDesc,
      locale: ogLocale,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitle,
      description: t.metaDesc,
      images: [ogImage.url],
    },
  };
}

export default async function LandingSsrPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(params.lang, cookieStore.get("erpaio_lang")?.value);
  const t: LandingContent = CATALOGS[locale];

  return (
    <div lang={t.htmlLang} dir={t.dir}>
      {/* Shared landing CSS extracted in F.5a. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/landing.css" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <ScrollTopBtn />
      <Topbar tagline={t.topbarTagline} />
      <Nav t={t} locale={locale} />
      <Sidebar t={t} locale={locale} />
      <Hero t={t} />
      <StatsBar stats={t.stats} />
      <Marquee items={t.marqueeItems} />
      <CoreIdea t={t.coreIdea} />
      <Features t={t.features} />
      <UseCases t={t.useCases} />
      <Platform t={t.platform} />

      {/* Sprint G.3 — interactive AI demo right after we explain the
          platform: prove the loop the moment it's described. */}
      <LandingErrorBoundary section="ai-demo">
        <AiDemoPreview locale={locale} />
      </LandingErrorBoundary>

      {/* Sprint G.5 — analytics dashboard demo (range + analysis →
          chart + live AI SQL). */}
      <LandingErrorBoundary section="analytics">
        <AnalyticsDashboard locale={locale} />
      </LandingErrorBoundary>

      <HowItWorks t={t.howItWorks} />
      <Trust t={t.trust} />

      {/* Sprint G.1 — enterprise trust pillars (read-only / RBAC /
          human approval / audit) after the high-level trust band. */}
      <EnterpriseTrust locale={locale} />

      {/* Sprint G.6 — data connection flow demo (masked credential +
          security assurance). Sits with the trust narrative. */}
      <LandingErrorBoundary section="data-connection">
        <DataConnection locale={locale} />
      </LandingErrorBoundary>

      <Technology t={t.technology} />
      <TrustedBy label={t.trustedByLabel} items={t.trustedByItems} />
      <Quote text={t.quoteText} attribution={t.quoteAttribution} />
      <FinalCta t={t.finalCta} />

      {/* Sprint G.2 — lead-gen demo request form before the generic
          contact section. */}
      <LandingErrorBoundary section="demo-request">
        <DemoRequest locale={locale} />
      </LandingErrorBoundary>

      <Contact t={t.contact} />
      <Footer t={t.footer} />

      <LandingInteractive />
    </div>
  );
}

// ---------- Helpers ----------

function HtmlBlock({ html, as: As = "div", className, style }: { html: string; as?: "div" | "h1" | "p" | "span"; className?: string; style?: React.CSSProperties }) {
  return <As className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------- Components ----------

function ScrollTopBtn() {
  return (
    <button className="scroll-top-btn" id="scrollTopBtn" title="Scroll to top" aria-label="Scroll to top">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20V4M6 10l6-6 6 6" />
      </svg>
    </button>
  );
}

function Topbar({ tagline }: { tagline: string }) {
  return (
    <div className="topbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.svg"
        alt="ERPAIO"
        style={{ height: 14, width: "auto", filter: "invert(1) brightness(2)", verticalAlign: "middle", marginRight: 4 }}
      />
      <span className="topbar-sep">{"\u2014"}</span>
      <span>{tagline}</span>
    </div>
  );
}

function LangSwitcher({ locale, wrapperStyle, optionStyle }: { locale: Locale; wrapperStyle: React.CSSProperties; optionStyle: React.CSSProperties }) {
  return (
    <span style={wrapperStyle}>
      {(["en", "tr", "ar"] as const).map((lang) => (
        <a
          key={lang}
          href={`?lang=${lang}`}
          className="lang-opt"
          data-lang={lang}
          style={{ ...optionStyle, color: lang === locale ? "var(--text)" : "var(--text-secondary)" }}
        >
          {lang.toUpperCase()}
        </a>
      ))}
    </span>
  );
}

function Nav({ t, locale }: { t: LandingContent; locale: Locale }) {
  return (
    <nav>
      {/* The ERPAIO emblem IS the menu trigger (single emblem, no separate
          hamburger). id="hamburger" keeps LandingInteractive's toggle wired. */}
      <button className="hamburger" id="hamburger" aria-label={t.navAriaMenu} style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nav-logo" src="/logo-mark.svg" alt="ERPAIO" style={{ height: 44, width: "auto", display: "block" }} />
      </button>
      <div className="nav-links">
        <a
          href="/login"
          style={{
            padding: "8px 18px",
            background: "var(--bg-dark)",
            color: "var(--text-light)",
            borderRadius: 100,
            fontWeight: 500,
            textDecoration: "none",
            fontSize: 13,
            letterSpacing: "0.3px",
            marginRight: 4,
          }}
        >
          {t.signInLabel}
        </a>
        {t.navLinks.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
        <LangSwitcher
          locale={locale}
          wrapperStyle={{
            display: "inline-flex",
            gap: 0,
            marginLeft: 12,
            border: "1px solid var(--border)",
            borderRadius: 100,
            overflow: "hidden",
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 10,
            letterSpacing: 1.5,
          }}
          optionStyle={{ padding: "5px 10px", textDecoration: "none" }}
        />
      </div>
    </nav>
  );
}

function Sidebar({ t, locale }: { t: LandingContent; locale: Locale }) {
  return (
    <>
      <div className="sidebar-overlay" id="sidebarOverlay"></div>
      <div className="sidebar" id="sidebar">
        <div className="sidebar-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="ERPAIO" style={{ height: 32, width: "auto" }} />
          <button className="sidebar-close" id="sidebarClose">
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          <a
            href="/login"
            className="sidebar-link"
            style={{
              background: "var(--bg-dark)",
              color: "var(--text-light)",
              textAlign: "center",
              borderRadius: 100,
              padding: "16px 0",
              marginBottom: 12,
              border: "none",
              letterSpacing: 2,
            }}
          >
            {t.signInLabel}
          </a>
          {t.sidebarLinks.map((l) => (
            <a key={l.href} href={l.href} className="sidebar-link">
              {l.label}
            </a>
          ))}
          <LangSwitcher
            locale={locale}
            wrapperStyle={{
              display: "flex",
              gap: 0,
              marginTop: 20,
              border: "1px solid var(--border)",
              borderRadius: 100,
              overflow: "hidden",
              fontFamily: "JetBrains Mono,monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              alignSelf: "center",
            }}
            optionStyle={{ padding: "8px 16px", textDecoration: "none" }}
          />
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-links">
            {t.sidebarFooterLinks.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
          <p className="sidebar-copyright">{t.sidebarCopyright}</p>
        </div>
      </div>
    </>
  );
}

function Hero({ t }: { t: LandingContent }) {
  return (
    <section className="hero dot-grid">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="hero-logo logo-anim"
        src="/logo.svg"
        alt="ERPAIO"
        style={{ height: "clamp(220px,40vh,380px)", width: "auto", maxWidth: "90%", margin: "0 auto 4px", display: "block" }}
      />
      <div className="hero-badge">
        <span className="dot"></span> {t.heroBadge}
      </div>
      <HtmlBlock as="h1" html={t.heroTitle} />
      <p>{t.heroDesc}</p>
      <div className="hero-actions">
        {/* Growth #3 — lead with the zero-commitment on-page demo; signup
            one click away as secondary. */}
        <a href="#ai-demo" className="btn-primary" data-cta="hero_primary">
          {t.ctaPrimary}
        </a>
        <a href="/signup" className="btn-secondary" data-cta="hero_secondary">
          {t.ctaSecondary}
        </a>
      </div>
      {/* Growth #4 — above-the-fold trust signals: kill the "will it touch
          our production ERP?" fear before the user even scrolls. */}
      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 20px",
          justifyContent: "center",
          fontSize: 12,
          letterSpacing: 0.3,
          color: "var(--text-secondary)",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {t.heroTrust.map((item, i) => (
          <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span aria-hidden style={{ opacity: 0.4 }}>·</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ opacity: 0.7 }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {item}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

function StatsBar({ stats }: { stats: LandingContent["stats"] }) {
  return (
    <div className="stats-bar">
      {stats.map((s) => (
        <div key={s.label} className="stat-item">
          <div className="stat-number">{s.number}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Marquee({ items }: { items: string[] }) {
  return (
    <div className="marquee-wrapper">
      <div className="marquee-track">
        {items.map((it) => (
          <span key={it} className="marquee-item">
            {it}
            <span className="sep"></span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CoreIdea({ t }: { t: LandingContent["coreIdea"] }) {
  return (
    <section id="core-idea">
      <div className="core-idea">
        <div className="section-label">{t.label}</div>
        <HtmlBlock className="section-title" html={t.title} />
        <div className="section-desc">{t.desc}</div>
        <div className="loop-steps">
          {t.loop.map((step) => (
            <span key={step} className="loop-chip">
              {step}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features({ t }: { t: LandingContent["features"] }) {
  return (
    <section id="features" style={{ background: "var(--bg-alt)" }}>
      <div className="features">
        <div className="features-header">
          <div className="section-label">{t.label}</div>
          <HtmlBlock className="section-title" html={t.title} />
          <div className="section-desc">{t.desc}</div>
        </div>
        <div className="features-grid">
          {t.cards.map((c) => (
            <div key={c.number} className="feature-card elevated fade-in">
              <div className="feature-number">{c.number}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases({ t }: { t: LandingContent["useCases"] }) {
  return (
    <section id="use-cases">
      <div className="use-cases">
        <div className="use-cases-header">
          <div className="section-label">{t.label}</div>
          <HtmlBlock className="section-title" html={t.title} />
          <div className="section-desc">{t.desc}</div>
        </div>
        <div className="use-cases-grid">
          {t.cards.map((c) => (
            <div key={c.title} className="use-case-card elevated fade-in">
              <h3>{c.title}</h3>
              <ul>
                {c.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platform({ t }: { t: LandingContent["platform"] }) {
  return (
    <section id="platform" style={{ background: "var(--bg-alt)" }}>
      <div className="showcase">
        <div className="showcase-header">
          <div className="section-label">{t.label}</div>
          <HtmlBlock className="section-title" html={t.title} />
          <div className="section-desc">{t.desc}</div>
        </div>
        <div className="bento-grid">
          <div className="bento-item elevated fade-in large">
            <div className="bento-label">{t.textToCode.label}</div>
            <h3>{t.textToCode.title}</h3>
            <p>{t.textToCode.body}</p>
            <HtmlBlock className="code-block" html={t.textToCode.codeHtml} />
          </div>
          <div className="bento-item elevated fade-in medium">
            <div className="bento-label">{t.rag.label}</div>
            <h3>{t.rag.title}</h3>
            <p>{t.rag.body}</p>
            <div className="pulse-visual">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-core"></div>
            </div>
          </div>
          <div className="bento-item elevated fade-in medium">
            <div className="bento-label">{t.connector.label}</div>
            <h3>{t.connector.title}</h3>
            <p>{t.connector.body}</p>
            <div className="integrations-row">
              {t.connector.chips.map((c) => (
                <span key={c} className="integration-chip">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="bento-item elevated fade-in large">
            <div className="bento-label">{t.threePillars.label}</div>
            <h3>{t.threePillars.title}</h3>
            <p>{t.threePillars.body}</p>
          </div>
          <div className="bento-item elevated fade-in wide" style={{ display: "flex", alignItems: "center", gap: 60 }}>
            <div>
              <div className="bento-label">{t.industry.label}</div>
              <h3>{t.industry.title}</h3>
              <p>{t.industry.body}</p>
            </div>
            <div className="vertical-tags">
              {t.industry.tags.map((tag) => (
                <span key={tag} className="vertical-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: LandingContent["howItWorks"] }) {
  return (
    <section id="how-it-works">
      <div className="how-it-works">
        <div className="how-it-works-header">
          <div className="section-label">{t.label}</div>
          <HtmlBlock className="section-title" html={t.title} />
          <div className="section-desc">{t.desc}</div>
        </div>
        <div className="steps">
          {t.steps.map((s) => (
            <div key={s.number} className="step">
              <div className="step-number">{s.number}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ k }: { k: "lock" | "users" | "check" | "doc" | "bulb" }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "block", margin: "0 auto" },
  };
  switch (k) {
    case "lock":
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    case "bulb":
      return (
        <svg {...common}>
          <line x1="9" y1="18" x2="15" y2="18" />
          <line x1="10" y1="22" x2="14" y2="22" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
      );
  }
}

function Trust({ t }: { t: LandingContent["trust"] }) {
  return (
    <section id="trust" style={{ background: "var(--bg-alt)" }}>
      <div className="trust">
        <div className="section-label">{t.label}</div>
        <HtmlBlock className="section-title" html={t.title} />
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>
        <div className="trust-grid">
          {t.cards.map((c) => (
            <div key={c.title} className="trust-card elevated fade-in">
              <span className="trust-icon">
                <TrustIcon k={c.iconKey} />
              </span>
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Technology({ t }: { t: LandingContent["technology"] }) {
  return (
    <section id="technology">
      <div className="tech">
        <div className="section-label">{t.label}</div>
        <HtmlBlock className="section-title" html={t.title} />
        <div className="section-desc">{t.desc}</div>
        <div className="tech-chips">
          {t.chips.map((c) => (
            <span key={c} className="tech-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustedBy({ label, items }: { label: string; items: string[] }) {
  const interleaved: React.ReactNode[] = items.map((it, i) => (
    <span key={`it-${i}`} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
      {it}
      {i < items.length - 1 && (
        <span aria-hidden="true" style={{ margin: "0 clamp(12px, 3.5vw, 48px)", opacity: 0.5 }}>
          {"\u2022"}
        </span>
      )}
    </span>
  ));
  return (
    <section
      style={{
        background: "var(--bg)",
        padding: "60px 32px",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label" style={{ marginBottom: 24 }}>
          {label}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 0",
            justifyContent: "center",
            alignItems: "center",
            opacity: 0.5,
            fontFamily: "JetBrains Mono,monospace",
            fontSize: 13,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {interleaved}
        </div>
      </div>
    </section>
  );
}

function Quote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <section>
      <div className="quote-section">
        <div className="quote-line"></div>
        <div className="quote-text">{text}</div>
        <div className="quote-attribution">{attribution}</div>
      </div>
    </section>
  );
}

function FinalCta({ t }: { t: LandingContent["finalCta"] }) {
  return (
    <section style={{ background: "var(--bg-alt)" }}>
      <div className="final-cta">
        <div className="section-label">{t.label}</div>
        <HtmlBlock className="section-title" html={t.title} />
        <div className="section-desc">{t.desc}</div>
        <div style={{ marginTop: 40 }}>
          <a href="/signup" className="btn-primary" data-cta="final_cta">
            {t.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

function Contact({ t }: { t: LandingContent["contact"] }) {
  return (
    <div className="contact-section" id="contact">
      <div className="contact">
        <div className="contact-wrapper">
          <div className="contact-info">
            <div className="section-label">{t.label}</div>
            <div className="section-title">{t.title}</div>
            <p>{t.desc}</p>
            <div className="contact-details">
              <div className="contact-detail">
                <div className="contact-detail-icon">@</div>
                <span id="emailAddr"></span>
              </div>
              <div className="contact-detail">
                <div className="contact-detail-icon">#</div>
                <span>{t.location}</span>
              </div>
            </div>
          </div>
          <div className="contact-form">
            <div id="formContent">
              <div className="form-row">
                <div className="form-group">
                  <label>{t.firstName.label}</label>
                  <input type="text" placeholder={t.firstName.placeholder} />
                </div>
                <div className="form-group">
                  <label>{t.lastName.label}</label>
                  <input type="text" placeholder={t.lastName.placeholder} />
                </div>
              </div>
              <div className="form-group">
                <label>{t.email.label}</label>
                <input type="email" placeholder={t.email.placeholder} />
              </div>
              <div className="form-group">
                <label>{t.company.label}</label>
                <input type="text" placeholder={t.company.placeholder} />
              </div>
              <div className="form-group">
                <label>{t.interest.label}</label>
                <select defaultValue="">
                  <option value="" disabled>
                    {t.interest.placeholderOption}
                  </option>
                  {t.interest.options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t.message.label}</label>
                <textarea placeholder={t.message.placeholder}></textarea>
              </div>
              <button className="form-submit" id="formSubmit">
                {t.submit}
              </button>
            </div>
            <div className="success-msg" id="successMsg">
              <h3>{t.successTitle}</h3>
              <p>{t.successBody}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ t }: { t: LandingContent["footer"] }) {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="footer-brand-logo"
            src="/logo.svg"
            alt="ERPAIO"
            style={{ height: 80, width: "auto", filter: "invert(1) brightness(2)", opacity: 0.9 }}
          />
          <p className="footer-tagline">{t.tagline}</p>
        </div>
        <div className="footer-links">
          {t.cols.map((col) => (
            <div key={col.heading} className="footer-col">
              <h4>{col.heading}</h4>
              {col.links.map((l) => (
                <a key={l.label} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          marginTop: 32,
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "center",
          alignItems: "center",
          opacity: 0.6,
          fontFamily: "JetBrains Mono,monospace",
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#888",
        }}
      >
        {t.badges.map((b) => (
          <span
            key={b}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "8px 14px",
              borderRadius: 6,
            }}
          >
            {b}
          </span>
        ))}
      </div>
      <div className="footer-bottom">
        <span>{t.copyright}</span>
        <span>{t.legalLinks}</span>
      </div>
    </footer>
  );
}
