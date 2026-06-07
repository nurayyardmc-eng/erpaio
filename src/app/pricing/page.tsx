"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X as XIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { colors } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/context";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: readonly string[];
  notIncluded?: readonly string[];
  cta: string;
  popular?: boolean;
}

export default function PricingPage() {
  const { t } = useI18n();
  // Revenue path fix — a logged-in (e.g. trial) user must NOT be sent to
  // /signup (dead end: they already have an account). Detect auth and send
  // them to the in-app upgrade screen instead. Trial-warning emails drive
  // traffic here, so this closes the trial → paid loop.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAuthed(!!d?.user); })
      .catch(() => { if (!cancelled) setAuthed(false); });
    return () => { cancelled = true; };
  }, []);

  const plans: Plan[] = [
    {
      name: t.pricing.starterName,
      price: "₺499",
      period: t.pricing.perMonth,
      description: t.pricing.starterDescription,
      features: t.pricing.starterFeatures,
      notIncluded: t.pricing.starterNotIncluded,
      cta: t.pricing.starterCta,
    },
    {
      name: t.pricing.proName,
      price: "₺2.499",
      period: t.pricing.perMonth,
      popular: true,
      description: t.pricing.proDescription,
      features: t.pricing.proFeatures,
      cta: t.pricing.proCta,
    },
    {
      name: t.pricing.enterpriseName,
      price: t.pricing.enterprisePrice,
      period: "",
      description: t.pricing.enterpriseDescription,
      features: t.pricing.enterpriseFeatures,
      cta: t.pricing.enterpriseCta,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text }}>
      <header style={{
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <Link href="/"><Logo size={28} variant="mark" /></Link>
        <Link href="/login" style={{ color: colors.textMuted, fontSize: 14, fontWeight: 500 }}>{t.pricing.login}</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{
            fontSize: 40,
            margin: "0 0 12px",
            fontWeight: 800,
            color: colors.text,
            letterSpacing: -1,
          }}>
            {t.pricing.headline}
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>
            {t.pricing.tagline}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {plans.map((p) => (
            <div key={p.name} style={{
              background: colors.card,
              border: `${p.popular ? 2 : 1}px solid ${p.popular ? colors.brand : colors.border}`,
              borderRadius: 16,
              padding: 32,
              position: "relative",
            }}>
              {p.popular && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: 24,
                  background: colors.brand,
                  color: colors.textInverse,
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}>
                  {t.pricing.popularBadge}
                </div>
              )}
              <div style={{
                color: colors.brand,
                fontSize: 12,
                letterSpacing: 2,
                marginBottom: 12,
                fontWeight: 600,
                textTransform: "uppercase",
              }}>
                {p.name}
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: colors.text, letterSpacing: -1 }}>
                  {p.price}
                </span>
                <span style={{ color: colors.textMuted, fontSize: 16 }}>{p.period}</span>
              </div>
              <p style={{
                color: colors.textMuted,
                fontSize: 14,
                marginBottom: 28,
                lineHeight: 1.5,
              }}>
                {p.description}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{
                    color: colors.text,
                    fontSize: 14,
                    lineHeight: 1.6,
                    paddingLeft: 28,
                    position: "relative",
                    marginBottom: 8,
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 2, color: colors.brand }}>
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
                {p.notIncluded?.map((f) => (
                  <li key={f} style={{
                    color: colors.textSubtle,
                    fontSize: 14,
                    lineHeight: 1.6,
                    paddingLeft: 28,
                    position: "relative",
                    marginBottom: 8,
                    textDecoration: "line-through",
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 2 }}>
                      <XIcon size={16} strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {(() => {
                const isEnterprise = p.name === t.pricing.enterpriseName;
                const href = isEnterprise
                  ? "mailto:sales@erpaio.com"
                  : authed
                    ? "/dashboard/settings"
                    : "/signup";
                // Logged-in users see "Manage plan" instead of the trial CTA
                // (which is meaningless once you already have an account).
                const label = !isEnterprise && authed ? t.pricing.manageCta : p.cta;
                return (
                  <Link
                    href={href}
                    style={{
                      display: "block",
                      background: p.popular ? colors.brand : colors.bg,
                      color: p.popular ? colors.textInverse : colors.brand,
                      border: `1px solid ${colors.brand}`,
                      borderRadius: 10,
                      padding: 14,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </Link>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Decision-point trust signals — reduce the security objection
            right where the user is choosing a plan. */}
        <div style={{
          marginTop: 48,
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 24px",
          justifyContent: "center",
          fontSize: 13,
          color: colors.textMuted,
        }}>
          {t.pricing.trust.map((item) => (
            <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={15} strokeWidth={2.5} color={colors.brand} />
              {item}
            </span>
          ))}
        </div>

        <div style={{
          marginTop: 28,
          textAlign: "center",
          color: colors.textSubtle,
          fontSize: 13,
        }}>
          {t.pricing.footer}
        </div>
      </main>

      <footer style={{
        padding: "24px 32px",
        borderTop: `1px solid ${colors.border}`,
        textAlign: "center",
        fontSize: 13,
        color: colors.textSubtle,
      }}>
        <Link href="/privacy" style={{ color: colors.textSubtle, marginRight: 20 }}>{t.pricing.linkPrivacy}</Link>
        <Link href="/terms" style={{ color: colors.textSubtle }}>{t.pricing.linkTerms}</Link>
      </footer>
    </div>
  );
}
