/**
 * Production readiness audit — declares which env-dependent capabilities
 * are configured. Track KKKKKKK.
 *
 * Used by admin dashboard to show "Setup checklist" and reveal missing
 * production hardening at a glance.
 *
 * Pure: only reads process.env, returns a structured report. No I/O.
 *
 * Why per-capability instead of "all-or-nothing": pilot deployments
 * intentionally skip Stripe/iyzico (manual billing) but still want hard
 * checks on rate limit + Sentry. Granular flags let ops dashboard mark
 * "ready for scale" partially.
 */

export type ReadinessLevel = "ok" | "missing" | "fallback";

export interface ReadinessCheck {
  key: string;
  label: string;
  level: ReadinessLevel;
  detail: string;
  /** When true, deployment can serve real users; when false, dev-only. */
  productionRequired: boolean;
}

export interface ReadinessReport {
  checks: ReadinessCheck[];
  /** Count of `missing` checks marked `productionRequired`. */
  blockerCount: number;
  /** Count of `fallback` warnings (works but suboptimal). */
  warningCount: number;
}

function check(
  envVars: string | string[],
  label: string,
  productionRequired: boolean,
  okDetail: string,
  missingDetail: string,
): ReadinessCheck {
  const vars = Array.isArray(envVars) ? envVars : [envVars];
  const allSet = vars.every((v) => !!process.env[v]);
  return {
    key: vars[0],
    label,
    level: allSet ? "ok" : "missing",
    detail: allSet ? okDetail : missingDetail,
    productionRequired,
  };
}

function fallbackCheck(
  envVars: string | string[],
  label: string,
  productionRequired: boolean,
  okDetail: string,
  fallbackDetail: string,
): ReadinessCheck {
  const c = check(envVars, label, productionRequired, okDetail, fallbackDetail);
  if (c.level === "missing") c.level = "fallback";
  return c;
}

export function getReadinessReport(): ReadinessReport {
  const checks: ReadinessCheck[] = [
    // --- Production blockers ---
    check(
      "DATABASE_URL",
      "Database connection (Supabase)",
      true,
      "DATABASE_URL set",
      "DATABASE_URL eksik — uygulama başlatılamaz",
    ),
    check(
      "ENCRYPTION_KEY",
      "AES-256-GCM encryption key",
      true,
      "ENCRYPTION_KEY set (64-hex char)",
      "ENCRYPTION_KEY eksik — ERP credentials okunamaz",
    ),
    check(
      "NEXTAUTH_SECRET",
      "NextAuth JWT secret",
      true,
      "NEXTAUTH_SECRET set",
      "NEXTAUTH_SECRET eksik — session imzası kırılır",
    ),
    check(
      "ANTHROPIC_API_KEY",
      "Anthropic API (chat)",
      true,
      "ANTHROPIC_API_KEY set",
      "ANTHROPIC_API_KEY eksik — chat çalışmaz",
    ),
    check(
      "CRON_SECRET",
      "Cron bearer secret",
      true,
      "CRON_SECRET set",
      "CRON_SECRET eksik — cron endpoint'leri çağrılamaz",
    ),

    // --- Production warnings (works but degraded) ---
    fallbackCheck(
      ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      "Rate limit (Upstash Redis)",
      false,
      "Upstash Redis bağlı — distributed rate limit aktif",
      "In-memory fallback — per-instance counter, prod scale'de zayıf",
    ),
    fallbackCheck(
      "NEXT_PUBLIC_SENTRY_DSN",
      "Error tracking (Sentry)",
      false,
      "Sentry DSN set — production hataları toplanıyor",
      "Sentry DSN eksik — error tracking yok",
    ),
    fallbackCheck(
      "RESEND_API_KEY",
      "Email delivery (Resend)",
      false,
      "Resend API key set — email çıkıyor",
      "Resend API key eksik — email'ler skip ediliyor",
    ),
    fallbackCheck(
      ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
      "WhatsApp (Twilio)",
      false,
      "Twilio bağlı — WhatsApp aktif",
      "Twilio eksik — WhatsApp skip ediliyor",
    ),

    // --- Billing (intentionally optional) ---
    fallbackCheck(
      "STRIPE_SECRET_KEY",
      "Stripe billing",
      false,
      "Stripe configured",
      "Stripe yok (TR'de mevcut değil — manuel pilot faturalandırma)",
    ),
    fallbackCheck(
      ["IYZICO_API_KEY", "IYZICO_SECRET_KEY"],
      "iyzico billing (TR)",
      false,
      "iyzico configured",
      "iyzico yok — TR ödeme manuel",
    ),
  ];

  const blockerCount = checks.filter(
    (c) => c.level === "missing" && c.productionRequired,
  ).length;
  const warningCount = checks.filter((c) => c.level === "fallback").length;

  return { checks, blockerCount, warningCount };
}
