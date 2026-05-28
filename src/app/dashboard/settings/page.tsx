"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";
import { showToast } from "@/components/Toaster";
import { showNpsPrompt } from "@/components/NpsPrompt";
import { confirmDialog } from "@/components/Confirm";
import { useI18n } from "@/lib/i18n/context";
import { postJson, patchJson } from "@/lib/http/clientFetch";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Dictionary, type Locale } from "@/lib/i18n/dictionary";
import { colors } from "@/lib/theme";
import { formatDate, formatRelativeTime, formatTokens } from "@/lib/format/time";
import { isOwnerOrAdmin } from "@/lib/auth/role";

interface TenantSettings {
  id: string;
  name: string;
  plan: string;
  whatsappTo: string | null;
  whatsappEnabled: boolean;
  emailTo: string | null;
  emailEnabled: boolean;
  alertMinSeverity: "low" | "medium" | "high" | "critical";
  defaultLocale: "tr" | "en";
}

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdStatus, setPwdStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Profile (kişisel bilgi + avatar)
  const [profile, setProfile] = useState({ name: "", email: "", avatarBase64: null as string | null });
  const [profileSaving, setProfileSaving] = useState(false);

  // Token usage
  const [usage, setUsage] = useState<{
    used: number;
    budget: number;
    remaining: number;
    percentUsed: number;
    resetsOn: string;
  } | null>(null);

  // Feature 7.6 — handle iyzico/stripe checkout callback redirect.
  // Provider hosts checkout on its own domain; on success it sends the user
  // back to /dashboard/settings?upgrade=success&provider=<iyzico|stripe>.
  // We show a localized toast and strip the query so a reload won't re-fire.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    if (!upgrade) return;
    if (upgrade === "success") {
      showToast(t.billing.upgradeSuccess, "success");
    } else if (upgrade === "cancel") {
      showToast(t.billing.upgradeCancelled, "info");
    } else if (upgrade === "failed") {
      showToast(t.billing.upgradeFailed, "error");
    }
    // Clean the query string so reload won't re-fire the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("upgrade");
    url.searchParams.delete("provider");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  }, [t.billing.upgradeSuccess, t.billing.upgradeCancelled, t.billing.upgradeFailed]);

  useEffect(() => {
    fetch("/api/tenant").then(async (r) => {
      if (r.ok) setTenant(await r.json());
    });
    fetch("/api/me").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setProfile({
          name: d.user?.name ?? "",
          email: d.user?.email ?? "",
          avatarBase64: d.user?.avatarBase64 ?? null,
        });
      }
    });
    fetch("/api/tenant/usage").then(async (r) => {
      if (r.ok) setUsage(await r.json());
    });
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await patchJson("/api/me", {
        name: profile.name || null,
        avatarBase64: profile.avatarBase64,
      });
      if (res.ok) {
        showToast(t.settings.profileSaved, "success");
      } else {
        const data = await res.json();
        showToast(data.error || t.common.error, "error");
      }
    } catch {
      showToast(t.common.networkError, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      showToast(t.settings.avatarTooLarge, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfile((p) => ({ ...p, avatarBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await patchJson("/api/tenant", {
        name: tenant.name,
        whatsappTo: tenant.whatsappTo || null,
        whatsappEnabled: tenant.whatsappEnabled,
        emailTo: tenant.emailTo || null,
        emailEnabled: tenant.emailEnabled,
        alertMinSeverity: tenant.alertMinSeverity,
        defaultLocale: tenant.defaultLocale,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ kind: "ok", msg: t.common.saved });
      } else {
        setStatus({ kind: "err", msg: data.error || t.settings.saveFailed });
      }
    } catch {
      setStatus({ kind: "err", msg: t.common.networkError });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwd.next !== pwd.confirm) {
      setPwdStatus({ kind: "err", msg: t.settings.passwordMismatch });
      return;
    }
    if (pwd.next.length < 8) {
      setPwdStatus({ kind: "err", msg: t.settings.passwordTooShort });
      return;
    }
    setPwdSaving(true);
    setPwdStatus(null);
    try {
      const res = await postJson("/api/me/password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      const data = await res.json();
      if (res.ok) {
        setPwdStatus({ kind: "ok", msg: t.settings.passwordChanged });
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        setPwdStatus({ kind: "err", msg: data.error || t.settings.passwordGenericError });
      }
    } catch {
      setPwdStatus({ kind: "err", msg: t.common.networkError });
    } finally {
      setPwdSaving(false);
    }
  };

  if (!tenant) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.textMuted, padding: 40 }}>
        {t.settings.loading}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle }}>
      <header style={{
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/dashboard">
          <Logo size={28} variant="mark" />
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
        <Link href="/dashboard" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
          {t.settings.backToDashboard}
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, margin: "0 0 32px", letterSpacing: -0.5 }}>
          {t.settings.title}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title={t.settings.profile}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                background: profile.avatarBase64 ? "transparent" : colors.brand,
                color: colors.textInverse,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
                flexShrink: 0,
                border: `1px solid ${colors.border}`,
              }}>
                {profile.avatarBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarBase64} alt={t.settings.avatarAlt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (profile.name || profile.email).slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <label style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 100,
                  fontSize: 13,
                  cursor: "pointer",
                  background: colors.bg,
                  color: colors.text,
                  fontWeight: 500,
                }}>
                  {t.settings.avatarUpload}
                  <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
                </label>
                {profile.avatarBase64 && (
                  <button
                    onClick={() => setProfile({ ...profile, avatarBase64: null })}
                    style={{ marginLeft: 8, padding: "8px 12px", background: "transparent", border: "none", color: colors.error, fontSize: 12, cursor: "pointer" }}
                  >
                    {t.settings.avatarRemove}
                  </button>
                )}
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{t.settings.avatarHint}</div>
              </div>
            </div>

            <Field label={t.settings.profileName}>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder={t.settings.profileNamePlaceholder}
                style={inputStyle}
              />
            </Field>
            <Field label={t.settings.profileEmail}>
              <div style={{ ...inputStyle, color: colors.textMuted, background: colors.bgSubtle }}>
                {profile.email}
              </div>
              <EmailChangeRow currentEmail={profile.email} />
            </Field>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={saveProfile}
                disabled={profileSaving}
                style={primaryBtn}
              >
                {profileSaving ? t.common.saving : t.settings.profileSave}
              </button>
            </div>
          </Section>

          <Section title={t.settings.company}>
            <Field label={t.settings.tenantName}>
              <input
                value={tenant.name}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label={t.settings.plan}>
              <div style={{
                ...inputStyle,
                color: colors.brand,
                background: colors.brandSoft,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: 13,
              }}>
                {tenant.plan}
              </div>
            </Field>
          </Section>

          <BillingSection t={t} />

          {usage && (
            <Section title={t.settings.usage}>
              <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                {t.settings.usageDescription}
              </p>
              {/* Progress bar */}
              <div style={{
                height: 8,
                borderRadius: 100,
                background: colors.bgSubtle,
                overflow: "hidden",
                marginBottom: 12,
              }}>
                <div style={{
                  width: `${usage.percentUsed}%`,
                  height: "100%",
                  background: usage.percentUsed >= 90 ? colors.error : usage.percentUsed >= 70 ? "#F59E0B" : colors.brand,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.text, marginBottom: 6 }}>
                <span><strong>{formatTokens(usage.used)}</strong>{t.settings.usageUsedSuffix}</span>
                <span style={{ color: colors.textMuted }}>
                  <strong>{formatTokens(usage.remaining)}</strong>{t.settings.usageRemainingSuffix}
                </span>
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>
                {t.settings.usageResetPrefix}
                {formatDate(usage.resetsOn)}
              </div>
              {usage.percentUsed >= 90 && (
                <div style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: colors.errorSoft,
                  border: `1px solid ${colors.error}`,
                  borderRadius: 8,
                  color: colors.error,
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  {t.settings.usageWarning}
                </div>
              )}
            </Section>
          )}

          <Section title={t.settings.language}>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>
              {t.settings.languageHint}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    if (loc === locale) return;
                    setLocale(loc as Locale);
                    showToast(t.settings.languageSaved, "success");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 100,
                    background: loc === locale ? colors.brand : colors.bg,
                    color: loc === locale ? colors.textInverse : colors.text,
                    border: `1px solid ${loc === locale ? colors.brand : colors.border}`,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </Section>

          {/* Track WWWW — manuel NPS feedback trigger. NpsPrompt'un cool-down'unu
              bypass eder; user "ben şu an feedback vermek istiyorum" diyebilir. */}
          <Section title={t.settings.feedbackTitle}>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
              {t.settings.feedbackDescription}
            </p>
            <button
              type="button"
              onClick={() => showNpsPrompt()}
              style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 100,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.settings.feedbackOpenBtn}
            </button>
          </Section>

          <Section title={t.settings.whatsapp}>
            <Toggle
              label={t.settings.whatsappEnabled}
              checked={tenant.whatsappEnabled}
              onChange={(v) => setTenant({ ...tenant, whatsappEnabled: v })}
            />
            <Field label={t.settings.whatsappTo}>
              <input
                value={tenant.whatsappTo ?? ""}
                onChange={(e) => setTenant({ ...tenant, whatsappTo: e.target.value })}
                placeholder={t.settings.whatsappPlaceholder}
                style={inputStyle}
                disabled={!tenant.whatsappEnabled}
              />
            </Field>
          </Section>

          <Section title={t.settings.email}>
            <Toggle
              label={t.settings.emailEnabled}
              checked={tenant.emailEnabled}
              onChange={(v) => setTenant({ ...tenant, emailEnabled: v })}
            />
            <Field label={t.settings.emailTo}>
              <input
                type="email"
                value={tenant.emailTo ?? ""}
                onChange={(e) => setTenant({ ...tenant, emailTo: e.target.value })}
                placeholder={t.settings.emailPlaceholder}
                style={inputStyle}
                disabled={!tenant.emailEnabled}
              />
            </Field>
          </Section>

          <Section title={t.settings.alertThreshold}>
            <Field label={t.settings.alertSeverity}>
              <select
                value={tenant.alertMinSeverity}
                onChange={(e) => setTenant({ ...tenant, alertMinSeverity: e.target.value as TenantSettings["alertMinSeverity"] })}
                style={inputStyle}
              >
                <option value="low">{t.settings.severityLow}</option>
                <option value="medium">{t.settings.severityMedium}</option>
                <option value="high">{t.settings.severityHigh}</option>
                <option value="critical">{t.settings.severityCritical}</option>
              </select>
            </Field>
            <Field label={t.settings.defaultLocaleLabel}>
              <select
                value={tenant.defaultLocale}
                onChange={(e) => setTenant({ ...tenant, defaultLocale: e.target.value as "tr" | "en" })}
                style={inputStyle}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
              <p style={{ marginTop: 6, fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
                {t.settings.defaultLocaleHint}
              </p>
            </Field>
          </Section>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={save}
              disabled={saving}
              style={primaryBtn}
            >
              {saving ? t.common.saving : t.common.save}
            </button>
            {status && (
              <span style={{
                color: status.kind === "ok" ? colors.success : colors.error,
                fontSize: 13,
                fontWeight: 500,
              }}>
                {status.msg}
              </span>
            )}
          </div>

          <Section title={t.settings.password}>
            <Field label={t.settings.passwordCurrent}>
              <input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} style={inputStyle} />
            </Field>
            <Field label={t.settings.passwordNew}>
              <input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} style={inputStyle} />
            </Field>
            <Field label={t.settings.passwordConfirm}>
              <input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={changePassword}
                disabled={pwdSaving || !pwd.current || !pwd.next || !pwd.confirm}
                style={secondaryBtn}
              >
                {pwdSaving ? t.settings.passwordChanging : t.settings.passwordChange}
              </button>
              {pwdStatus && (
                <span style={{
                  color: pwdStatus.kind === "ok" ? colors.success : colors.error,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {pwdStatus.msg}
                </span>
              )}
            </div>
          </Section>

          <NotificationPrefsSection t={t} />

          <Section title={t.settings.accountSecurity}>
            <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
              {t.settings.accountSecurityDescription}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                { href: "/dashboard/security", label: t.settings.accountSecurityLink },
                { href: "/dashboard/devices", label: t.devices.linkLabel },
                { href: "/dashboard/activity", label: t.activity.linkLabel },
                { href: "/dashboard/consents", label: t.consents.linkLabel },
                { href: "/dashboard/slow-queries", label: t.slowQueries.linkLabel },
                { href: "/dashboard/notification-log", label: "Bildirim audit logu" },
              ] as const).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    display: "inline-block",
                    padding: "10px 18px",
                    borderRadius: 100,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </Section>

          <TenantCronHealthSection t={t} />

          <TenantNpsSection t={t} />

          <TenantExportSection t={t} />

          <DangerZone t={t} />
        </div>
      </main>
    </div>
  );
}

/**
 * BillingSection — Feature 7. Stripe + iyzico üzerinden abonelik yönetimi.
 *
 *   - Provider state fetched from /api/billing/provider (auth + tenant scoped).
 *   - starter → "Pro'ya Yükselt" CTA → iyzico aktifse modal (TR fatura
 *     alanları), aksi halde Stripe checkout redirect.
 *   - pro/enterprise → "Aboneliği Yönet" (Stripe portal) veya "İptal Et"
 *     (iyzico subscription cancel).
 */
interface BillingProviderInfo {
  plan: string;
  subscriptionStatus: string | null;
  paymentProvider: "stripe" | "iyzico" | null;
  upgradeProvider: "stripe" | "iyzico" | "manual";
  hasActiveSubscription: boolean;
  trialEndsAt: string | null;
  providerConfigured: { stripe: boolean; iyzico: boolean };
}

interface IyzicoForm {
  name: string;
  surname: string;
  identityNumber: string;
  gsmNumber: string;
  city: string;
  country: string;
  address: string;
  zipCode: string;
}

function BillingSection({ t }: { t: Dictionary }) {
  const [info, setInfo] = useState<BillingProviderInfo | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "enterprise" | null>(null);
  const [iyzicoForm, setIyzicoForm] = useState<IyzicoForm>({
    name: "",
    surname: "",
    identityNumber: "",
    gsmNumber: "",
    city: "",
    country: "Turkey",
    address: "",
    zipCode: "",
  });

  useEffect(() => {
    fetch("/api/billing/provider").then(async (r) => {
      if (r.ok) setInfo(await r.json());
    });
  }, []);

  if (!info) return null;

  const isStarter = info.plan === "starter";
  const showIyzicoModal = selectedPlan !== null && info.upgradeProvider === "iyzico";

  async function startUpgrade(plan: "pro" | "enterprise") {
    if (!info) return;
    if (info.upgradeProvider === "iyzico") {
      setSelectedPlan(plan);
      return;
    }
    if (info.upgradeProvider === "stripe") {
      setUpgrading(true);
      try {
        const r = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const d = await r.json();
        if (r.ok && d.url) window.location.href = d.url;
        else showToast(d.error ?? t.billing.upgradeFailed, "error");
      } catch {
        showToast(t.billing.upgradeFailed, "error");
      } finally {
        setUpgrading(false);
      }
      return;
    }
    showToast(t.billing.noProvider, "error");
  }

  async function submitIyzicoUpgrade() {
    if (!selectedPlan) return;
    setUpgrading(true);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          iyzico: {
            name: iyzicoForm.name,
            surname: iyzicoForm.surname,
            identityNumber: iyzicoForm.identityNumber || undefined,
            gsmNumber: iyzicoForm.gsmNumber || undefined,
            city: iyzicoForm.city,
            country: iyzicoForm.country,
            address: iyzicoForm.address,
            zipCode: iyzicoForm.zipCode || undefined,
          },
        }),
      });
      const d = await r.json();
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      showToast(d.error ?? t.billing.upgradeFailed, "error");
    } catch {
      showToast(t.billing.upgradeFailed, "error");
    } finally {
      setUpgrading(false);
    }
  }

  async function manageSubscription() {
    setManaging(true);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const d = await r.json();
      if (r.ok && d.url) window.location.href = d.url;
      else showToast(d.error ?? t.billing.cancelFailed, "error");
    } catch {
      showToast(t.billing.cancelFailed, "error");
    } finally {
      setManaging(false);
    }
  }

  async function cancelIyzicoSubscription() {
    const ok = await confirmDialog({
      title: t.billing.cancelConfirmTitle,
      message: t.billing.cancelConfirmMessage,
      confirmLabel: t.billing.cancelConfirmYes,
      cancelLabel: t.billing.cancelConfirmNo,
      destructive: true,
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        showToast(t.billing.cancelSuccessIyzico, "success");
        setInfo((prev) => (prev ? { ...prev, hasActiveSubscription: false } : prev));
      } else {
        showToast(d.error ?? t.billing.cancelFailed, "error");
      }
    } catch {
      showToast(t.billing.cancelFailed, "error");
    } finally {
      setCancelling(false);
    }
  }

  const statusLabel = info.subscriptionStatus
    ? {
        active: t.billing.statusActive,
        trialing: t.billing.statusTrialing,
        past_due: t.billing.statusPastDue,
        canceled: t.billing.statusCanceled,
        expired: t.billing.statusExpired,
        incomplete: t.billing.statusIncomplete,
      }[info.subscriptionStatus] ?? info.subscriptionStatus
    : null;

  return (
    <Section title={t.billing.sectionTitle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>
            {t.billing.currentPlan}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: 1 }}>
            {info.plan}
            {statusLabel && (
              <span style={{
                marginLeft: 12,
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 100,
                background: colors.brandSoft,
                color: colors.brand,
                textTransform: "none",
                letterSpacing: 0,
              }}>
                {statusLabel}
              </span>
            )}
          </div>
          {info.trialEndsAt && (
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
              {t.billing.trialEndsPrefix}: {new Date(info.trialEndsAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {isStarter ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => startUpgrade("pro")}
            disabled={upgrading}
            style={primaryBtn}
          >
            {upgrading ? t.billing.upgradingBtn : t.billing.selectPlanPro}
          </button>
          <button
            onClick={() => startUpgrade("enterprise")}
            disabled={upgrading}
            style={secondaryBtn}
          >
            {t.billing.selectPlanEnterprise}
          </button>
          {info.upgradeProvider === "iyzico" && (
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {t.billing.invoiceNoteIyzico}
            </div>
          )}
          {info.upgradeProvider === "manual" && (
            <div style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>
              {t.billing.noProvider}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {info.paymentProvider === "stripe" && (
            <button onClick={manageSubscription} disabled={managing} style={primaryBtn}>
              {managing ? t.billing.managingBtn : t.billing.manageBtn}
            </button>
          )}
          {info.paymentProvider === "iyzico" && info.hasActiveSubscription && (
            <button onClick={cancelIyzicoSubscription} disabled={cancelling} style={secondaryBtn}>
              {cancelling ? t.billing.cancellingBtn : t.billing.cancelBtn}
            </button>
          )}
        </div>
      )}

      {showIyzicoModal && (
        <IyzicoUpgradeModal
          t={t}
          form={iyzicoForm}
          setForm={setIyzicoForm}
          upgrading={upgrading}
          onSubmit={submitIyzicoUpgrade}
          onCancel={() => setSelectedPlan(null)}
        />
      )}
    </Section>
  );
}

function IyzicoUpgradeModal({
  t,
  form,
  setForm,
  upgrading,
  onSubmit,
  onCancel,
}: {
  t: Dictionary;
  form: IyzicoForm;
  setForm: (f: IyzicoForm) => void;
  upgrading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canSubmit =
    form.name.length > 0 &&
    form.surname.length > 0 &&
    form.city.length > 0 &&
    form.address.length >= 5;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.card,
          borderRadius: 16,
          padding: 28,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: colors.text }}>
          {t.billing.iyzicoFormTitle}
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
          {t.billing.iyzicoFormDescription}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t.billing.iyzicoName}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label={t.billing.iyzicoSurname}>
            <input
              value={form.surname}
              onChange={(e) => setForm({ ...form, surname: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label={t.billing.iyzicoIdentityNumber}>
          <input
            value={form.identityNumber}
            onChange={(e) => setForm({ ...form, identityNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            style={inputStyle}
            placeholder="11 digit"
          />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            {t.billing.iyzicoIdentityHint}
          </div>
        </Field>

        <Field label={t.billing.iyzicoGsm}>
          <input
            value={form.gsmNumber}
            onChange={(e) => setForm({ ...form, gsmNumber: e.target.value })}
            style={inputStyle}
            placeholder="+90555..."
          />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            {t.billing.iyzicoGsmHint}
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <Field label={t.billing.iyzicoCity}>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label={t.billing.iyzicoZip}>
            <input
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label={t.billing.iyzicoAddress}>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          />
        </Field>

        <Field label={t.billing.iyzicoCountry}>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={upgrading} style={secondaryBtn}>
            {t.billing.iyzicoCancelBtn}
          </button>
          <button onClick={onSubmit} disabled={upgrading || !canSubmit} style={primaryBtn}>
            {upgrading ? t.billing.upgradingBtn : t.billing.iyzicoSubmitBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tenant cron health — Track DD. Owner+admin görür platform crons'unun son
 * çalışma durumunu. "Anomaly cron sağlıklı mı?" sorusunun cevabı.
 * Direkt etkileyen 3 cron: anomaly-detection, watchlists, scheduled-reports.
 */
interface JobHealthData {
  jobName: string;
  status: "SUCCESS" | "PARTIAL_FAILURE" | "FAILED" | "RUNNING" | "NEVER";
  finishedAt: string | null;
  alertsCreated: number;
}

// formatRelativeTime + formatTokens moved to @/lib/format/time (Track XXXXX)

function TenantCronHealthSection({ t }: { t: Dictionary }) {
  const { locale } = useI18n();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobHealthData[] | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: { user?: { role?: string } } | null) => {
        const role = d?.user?.role ?? null;
        setUserRole(role);
        if (isOwnerOrAdmin(role)) {
          return fetch("/api/tenant/cron-health")
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { jobs: JobHealthData[] } | null) => setJobs(d?.jobs ?? null))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  if (userRole !== "owner" && userRole !== "admin") return null;

  const statusColor = (s: JobHealthData["status"]): { bg: string; fg: string } => {
    switch (s) {
      case "SUCCESS": return { bg: "#D1FAE5", fg: "#065F46" };
      case "PARTIAL_FAILURE": return { bg: "#FEF3C7", fg: "#92400E" };
      case "FAILED": return { bg: "#FEE2E2", fg: "#991B1B" };
      case "RUNNING": return { bg: "#E0F2FE", fg: "#075985" };
      case "NEVER": return { bg: "#F1F5F9", fg: "#64748B" };
    }
  };

  const statusLabel = (s: JobHealthData["status"]): string => {
    switch (s) {
      case "SUCCESS": return t.settings.cronHealthSuccess;
      case "PARTIAL_FAILURE": return t.settings.cronHealthPartial;
      case "FAILED": return t.settings.cronHealthFailed;
      case "RUNNING": return t.settings.cronHealthRunning;
      case "NEVER": return t.settings.cronHealthNever;
    }
  };

  const jobLabel = (name: string): string => {
    switch (name) {
      case "anomaly-detection": return t.settings.cronHealthAnomalyLabel;
      case "watchlists": return t.settings.cronHealthWatchlistsLabel;
      case "scheduled-reports": return t.settings.cronHealthReportsLabel;
      default: return name;
    }
  };

  return (
    <Section title={t.settings.cronHealthTitle}>
      <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
        {t.settings.cronHealthDescription}
      </p>
      {!jobs ? (
        <div style={{ color: colors.textMuted, fontSize: 12 }}>{t.common.loading}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((j) => {
            const c = statusColor(j.status);
            return (
              <div key={j.jobName} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: 500 }}>
                  {jobLabel(j.jobName)}
                </span>
                <span style={{ fontSize: 11, color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>
                  {formatRelativeTime(j.finishedAt, locale)}
                </span>
                <span style={{ background: c.bg, color: c.fg, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, letterSpacing: 0.5 }}>
                  {statusLabel(j.status)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/**
 * Tenant-scoped NPS aggregate — Track UUUU. Owner + admin görür; non-owner için
 * gizlenir (server gate de var). Sysadmin /api/nps cross-tenant aggregate'i ayrı.
 *
 * Veri: nps puanı (-100..+100), promoter/passive/detractor breakdown, son 100
 * yanıt detayı. Henüz cevap yoksa empty state.
 */
interface TenantNpsData {
  nps: number;
  breakdown: { promoters: number; passives: number; detractors: number; total: number };
  responses: { score: number; comment: string | null; respondedAt: string }[];
}

function TenantNpsSection({ t }: { t: Dictionary }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<TenantNpsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: { user?: { role?: string } } | null) => {
        const role = d?.user?.role ?? null;
        setUserRole(role);
        if (isOwnerOrAdmin(role)) {
          setLoading(true);
          return fetch("/api/tenant/nps")
            .then((r) => (r.ok ? r.json() : null))
            .then((d: TenantNpsData | null) => setData(d))
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      })
      .catch(() => {});
  }, []);

  if (userRole !== "owner" && userRole !== "admin") return null;

  const scoreColor = data && data.nps >= 30
    ? colors.success
    : data && data.nps >= 0
      ? "#F59E0B"
      : colors.error;

  return (
    <Section title={t.settings.tenantNpsTitle}>
      <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
        {t.settings.tenantNpsDescription}
      </p>
      {loading ? (
        <div style={{ color: colors.textMuted, fontSize: 12 }}>{t.common.loading}</div>
      ) : !data || data.breakdown.total === 0 ? (
        <div style={{ color: colors.textMuted, fontSize: 13, fontStyle: "italic" }}>
          {t.settings.tenantNpsEmpty}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {data.nps > 0 ? "+" : ""}{data.nps}
            </span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              {t.settings.tenantNpsScoreLabel} · {data.breakdown.total} {t.settings.tenantNpsResponsesLabel}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 11 }}>
            <span style={{ ...npsBadgeStyle, background: "#D1FAE5", color: "#065F46" }}>
              {t.settings.tenantNpsPromoters}: {data.breakdown.promoters}
            </span>
            <span style={{ ...npsBadgeStyle, background: "#F1F5F9", color: "#475569" }}>
              {t.settings.tenantNpsPassives}: {data.breakdown.passives}
            </span>
            <span style={{ ...npsBadgeStyle, background: "#FEE2E2", color: "#991B1B" }}>
              {t.settings.tenantNpsDetractors}: {data.breakdown.detractors}
            </span>
          </div>
          {data.responses.filter((r) => r.comment).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                {t.settings.tenantNpsRecentComments}
              </div>
              {data.responses.filter((r) => r.comment).slice(0, 5).map((r, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${r.score >= 9 ? "#10B981" : r.score >= 7 ? "#F59E0B" : "#EF4444"}`, paddingLeft: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {r.score}/10 · {new Date(r.respondedAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{r.comment}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

const npsBadgeStyle: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 100,
  fontWeight: 600,
  letterSpacing: 0.3,
};

/**
 * Tenant data export — KVKK md. 11 / GDPR Art. 20 right to data portability.
 * Owner-only (server gate); UI rolü çekip butonu non-owner için gizler.
 * Click → window.location.assign(/api/tenant/export) — browser otomatik
 * indirir (Content-Disposition + cookie auth). Audit log entry kaydedilir
 * (server'da, hassas işlem).
 */
function TenantExportSection({ t }: { t: Dictionary }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: { user?: { role?: string } } | null) => setUserRole(d?.user?.role ?? null))
      .catch(() => {});
  }, []);

  if (userRole !== "owner") return null;

  const download = () => {
    setDownloading(true);
    // Browser cookie auth ile direkt navigate — Content-Disposition tetikler.
    // setDownloading flag kısa süreli (anlık feedback); browser indirme
    // event'i biz görmüyoruz, 2s sonra geri al.
    window.location.assign("/api/tenant/export");
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <Section title={t.settings.tenantExportTitle}>
      <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
        {t.settings.tenantExportDescription}
      </p>
      <button
        onClick={download}
        disabled={downloading}
        style={{
          alignSelf: "flex-start",
          background: colors.text,
          color: colors.textInverse,
          border: "none",
          borderRadius: 100,
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: downloading ? "not-allowed" : "pointer",
          opacity: downloading ? 0.5 : 1,
          fontFamily: "inherit",
        }}
      >
        {downloading ? t.settings.tenantExportDownloadingBtn : t.settings.tenantExportBtn}
      </button>
      <p style={{ color: colors.textSubtle, fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
        {t.settings.tenantExportNote}
      </p>
    </Section>
  );
}

function DangerZone({ t }: { t: Dictionary }) {
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    const ok = await confirmDialog({
      title: t.settings.deleteAccountConfirmTitle,
      message: t.settings.deleteAccountConfirmMessage,
      confirmLabel: t.settings.deleteAccountConfirmYes,
      cancelLabel: t.settings.deleteAccountConfirmCancel,
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await postJson("/api/tenant/delete", { password, confirmation });
      const data = await res.json();
      if (res.ok) {
        showToast(t.settings.deleteAccountSuccess, "success");
        setTimeout(() => { window.location.href = "/"; }, 1500);
      } else {
        showToast(data.error || t.common.error, "error");
      }
    } catch {
      showToast(t.common.networkError, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section style={{
      background: "#FFFFFF",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: "#FEE2E2",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AlertTriangle size={16} color="#EF4444" />
        </div>
        <h2 style={{ fontSize: 16, color: "#EF4444", margin: 0, fontWeight: 600 }}>{t.settings.dangerZone}</h2>
      </div>

      <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        {t.settings.dangerZoneDescription}
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            color: "#EF4444",
            border: "1px solid #EF4444",
            borderRadius: 100,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t.settings.deleteAccount}
        </button>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 6 }}>{t.settings.deleteAccountPasswordLabel}</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 6 }}>
              {t.settings.deleteAccountConfirmInputLabelPrefix}<strong>{t.settings.deleteAccountConfirmInputLabelHighlight}</strong>{t.settings.deleteAccountConfirmInputLabelSuffix}
            </div>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={t.settings.deleteAccountConfirmInputPlaceholder}
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "ui-monospace, Menlo, Monaco, monospace",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={deleteAccount}
              disabled={deleting || !password || confirmation !== t.settings.deleteAccountConfirmInputPlaceholder}
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 100,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {deleting ? t.settings.deleting : t.settings.deleteAccountFinal}
            </button>
            <button
              onClick={() => { setShowForm(false); setPassword(""); setConfirmation(""); }}
              style={{
                background: "transparent",
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 100,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.common.cancel}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Email değiştirme inline row — Track YYY.
 * Profile section'da email field altında render edilir. Tıklayınca form
 * açar (newEmail + password). Submit → POST /api/me/email/request-change
 * → server YENİ email'e doğrulama linki yollar; kullanıcı linki tıklayınca
 * email atomik güncellenir.
 */
function EmailChangeRow({ currentEmail }: { currentEmail: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!newEmail || !password) return;
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      showToast(t.settings.emailChangeSameAsCurrent, "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson("/api/me/email/request-change", {
        newEmail: newEmail.trim(),
        currentPassword: password,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t.settings.emailChangeSentToast, "success");
        setOpen(false);
        setNewEmail("");
        setPassword("");
      } else {
        showToast(data.error || t.common.error, "error");
      }
    } catch {
      showToast(t.common.networkError, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: colors.text,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            fontFamily: "inherit",
          }}
        >
          {t.settings.emailChangeBtn} →
        </button>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
          {t.settings.emailChangeHint}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 12,
      padding: 14,
      background: colors.bgSubtle,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
          {t.settings.emailChangeFieldNew}
        </div>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="ornek@firma.com"
          autoComplete="email"
          style={{ ...inputStyle, fontSize: 13 }}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
          {t.settings.emailChangeFieldPassword}
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          style={{ ...inputStyle, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !newEmail || !password}
          style={{
            ...primaryBtn,
            padding: "8px 16px",
            fontSize: 12,
            opacity: submitting || !newEmail || !password ? 0.5 : 1,
          }}
        >
          {submitting ? t.settings.emailChangeSendingBtn : t.settings.emailChangeSendBtn}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setNewEmail(""); setPassword(""); }}
          style={{ ...secondaryBtn, padding: "8px 16px", fontSize: 12 }}
        >
          {t.common.cancel}
        </button>
      </div>
      <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>
        {t.settings.emailChangeNote}
      </div>
    </div>
  );
}

interface PushPrefs {
  alerts: boolean;
  anomaly: boolean;
  watchlists: boolean;
}

/**
 * Per-user push notification opt-in. KVKK md. 11 + GDPR Art. 21.
 * GET'le yükle, her toggle değişiminde PATCH — optimistic update + revert on error.
 */
function NotificationPrefsSection({ t }: { t: Dictionary }) {
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const [saving, setSaving] = useState<keyof PushPrefs | null>(null);

  useEffect(() => {
    fetch("/api/me/notification-prefs")
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setPrefs(d.prefs);
        }
      })
      .catch(() => {
        // Sessizce başarısız — kullanıcı sayfayı yenilediğinde tekrar yüklenir.
      });
  }, []);

  const toggle = async (key: keyof PushPrefs) => {
    if (!prefs || saving) return;
    const next = !prefs[key];
    const optimistic = { ...prefs, [key]: next };
    setPrefs(optimistic);
    setSaving(key);
    try {
      const res = await patchJson("/api/me/notification-prefs", { [key]: next });
      if (!res.ok) {
        setPrefs(prefs); // revert
        showToast(t.settings.notifPrefsSaveError, "error");
      } else {
        const d = await res.json();
        setPrefs(d.prefs);
        showToast(t.settings.notifPrefsSaved, "success");
      }
    } catch {
      setPrefs(prefs); // revert
      showToast(t.settings.notifPrefsSaveError, "error");
    } finally {
      setSaving(null);
    }
  };

  const rows: { key: keyof PushPrefs; label: string; desc: string }[] = [
    { key: "alerts", label: t.settings.notifPrefsAlerts, desc: t.settings.notifPrefsAlertsDesc },
    { key: "anomaly", label: t.settings.notifPrefsAnomaly, desc: t.settings.notifPrefsAnomalyDesc },
    { key: "watchlists", label: t.settings.notifPrefsWatchlists, desc: t.settings.notifPrefsWatchlistsDesc },
  ];

  return (
    <Section title={t.settings.notifPrefsTitle}>
      <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        {t.settings.notifPrefsDescription}
      </p>
      {prefs === null ? (
        <p style={{ color: colors.textMuted, fontSize: 13, margin: 0 }}>{t.common.loading}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => (
            <div
              key={r.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                padding: "12px 0",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.text, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  {r.label}
                </div>
                <div style={{ color: colors.textMuted, fontSize: 12, lineHeight: 1.5 }}>
                  {r.desc}
                </div>
              </div>
              <Toggle
                label={prefs[r.key] ? t.settings.notifPrefsToggleOn : t.settings.notifPrefsToggleOff}
                checked={prefs[r.key]}
                onChange={() => toggle(r.key)}
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <h2 style={{ fontSize: 16, color: colors.text, margin: 0, fontWeight: 600 }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        color: colors.text,
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: colors.text }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? colors.brand : colors.borderStrong,
          position: "relative",
          transition: "all 0.15s",
        }}
      >
        <span style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "all 0.15s",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.1)",
        }} />
      </span>
      <span>{label}</span>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: colors.text,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  background: colors.brand,
  border: "none",
  borderRadius: 10,
  padding: "10px 24px",
  color: colors.textInverse,
  fontSize: 14,
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "10px 24px",
  color: colors.text,
  fontSize: 14,
  fontWeight: 600,
};

// formatTokens moved to @/lib/format/time (Track XXXXX)
