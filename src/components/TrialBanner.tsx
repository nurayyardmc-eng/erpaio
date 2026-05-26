"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { trialBannerStatus, type TrialUrgency } from "@/lib/trial/banner";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";

/**
 * Trial countdown banner — Track AAAA. Tenant'ın trial sona ermesine
 * yaklaşırken kullanıcıya plan yükseltme hatırlatması. /api/tenant'tan
 * trialEndsAt + subscriptionStatus + plan çekip pure helper'a sorar.
 *
 * Banner null dönerse hiçbir şey render edilmez (>14 gün veya paid plan).
 * Server'da cron trial-warnings ayrıca email gönderir; bu in-app reminder.
 */

// Track AAAAAAAAA: bg + border from theme.colors.*Soft / .*. Foreground stays
// dark-shade hex (theme has no dedicated dark-amber/dark-red text shades, and
// readability inside soft bg requires the specific WCAG-AA pair).
const STYLES: Record<TrialUrgency, { bg: string; fg: string; border: string }> = {
  info: { bg: "#F1F5F9", fg: "#0F172A", border: "#CBD5E1" },
  warning: { bg: colors.warningSoft, fg: "#92400E", border: colors.warning },
  danger: { bg: colors.errorSoft, fg: "#991B1B", border: colors.error },
  expired: { bg: colors.errorSoft, fg: "#991B1B", border: colors.error },
};

interface TenantApi {
  plan: string | null;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
}

export default function TrialBanner() {
  const { t } = useI18n();
  const [tenant, setTenant] = useState<TenantApi | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/tenant")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: TenantApi | null) => setTenant(d))
      .catch(() => {});
  }, []);

  if (!tenant || dismissed) return null;
  const status = trialBannerStatus(tenant);
  if (!status) return null;

  const style = STYLES[status.urgency];
  const expired = status.urgency === "expired";

  // Message template: kalan günler / X gün ago
  const message = expired
    ? t.trialBanner.expiredMessage
    : status.daysLeft === 1
      ? t.trialBanner.lastDayMessage
      : `${t.trialBanner.daysLeftPrefix}${status.daysLeft}${t.trialBanner.daysLeftSuffix}`;

  return (
    <div style={{
      background: style.bg,
      borderBottom: `1px solid ${style.border}`,
      padding: "10px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: style.fg, fontSize: 13, fontWeight: 600 }}>
          {expired ? t.trialBanner.expiredTitle : t.trialBanner.title}
        </span>
        <span style={{ color: style.fg, fontSize: 13, marginLeft: 8 }}>
          · {message}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link
          href="/pricing"
          style={{
            background: style.fg,
            color: style.bg,
            padding: "6px 14px",
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t.trialBanner.upgradeBtn} →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t.trialBanner.dismissAria}
          style={{
            background: "transparent",
            border: "none",
            color: style.fg,
            cursor: "pointer",
            fontSize: 16,
            padding: "2px 8px",
            fontWeight: 300,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
