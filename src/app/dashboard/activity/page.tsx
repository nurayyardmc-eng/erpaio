"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";
import { rowsToCsv, downloadCsv } from "@/lib/csv";

interface Activity {
  id: string;
  action: string;
  target: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Action key → human-readable label (TR + EN parity dictionary'de yok çünkü
// action sayısı az ve sabit — gerekirse genişler.)
const ACTION_LABELS_TR: Record<string, string> = {
  "profile.update": "Profil güncelleme",
  "profile.avatar.update": "Avatar güncelleme",
  "password.change": "Şifre değiştirme",
  "password.reset": "Şifre sıfırlama",
  "mfa.enable": "MFA aktivasyonu",
  "mfa.disable": "MFA devre dışı",
  "mfa.recovery.regenerate": "Kurtarma kodu yenileme",
  "mfa.recovery.consume": "Kurtarma kodu kullanımı",
  "session.revoke": "Oturum sonlandırma",
  "tenant.update": "Tenant ayarları güncelleme",
  "tenant.branding.update": "Branding güncelleme",
  "tenant.delete": "Hesap silme",
  "team.invite": "Takım üyesi davet",
  "team.member.remove": "Takım üyesi silme",
  "team.role.change": "Rol değiştirme",
  "integration.update": "Entegrasyon güncelleme",
  "ip_allowlist.add": "IP allowlist ekleme",
  "ip_allowlist.remove": "IP allowlist silme",
  "api_token.create": "API token oluşturma",
  "api_token.revoke": "API token iptali",
  "notification.prefs.update": "Bildirim tercihleri güncellendi",
  "push_token.revoke": "Cihaz (push) silindi",
  "alert.feedback.false_positive": "Alert yanlış alarm olarak işaretlendi",
  "alert.feedback.clear": "Alert FP işareti kaldırıldı",
};

const ACTION_LABELS_EN: Record<string, string> = {
  "profile.update": "Profile updated",
  "profile.avatar.update": "Avatar updated",
  "password.change": "Password changed",
  "password.reset": "Password reset",
  "mfa.enable": "MFA enabled",
  "mfa.disable": "MFA disabled",
  "mfa.recovery.regenerate": "Recovery codes regenerated",
  "mfa.recovery.consume": "Recovery code used",
  "session.revoke": "Session revoked",
  "tenant.update": "Tenant settings updated",
  "tenant.branding.update": "Branding updated",
  "tenant.delete": "Account deleted",
  "team.invite": "Team member invited",
  "team.member.remove": "Team member removed",
  "team.role.change": "Role changed",
  "integration.update": "Integration updated",
  "ip_allowlist.add": "IP allowlist added",
  "ip_allowlist.remove": "IP allowlist removed",
  "api_token.create": "API token created",
  "api_token.revoke": "API token revoked",
  "notification.prefs.update": "Notification preferences updated",
  "push_token.revoke": "Device (push) removed",
  "alert.feedback.false_positive": "Alert marked as false positive",
  "alert.feedback.clear": "Alert FP mark cleared",
};

export default function ActivityPage() {
  const { t, locale } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/activity?limit=100")
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.error || t.common.error);
          setLoading(false);
          return;
        }
        const d = await r.json();
        setActivities(d.activities ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t.common.error);
        setLoading(false);
      });
  }, [t.common.error]);

  const actionLabel = (action: string): string => {
    const labels = locale === "en" ? ACTION_LABELS_EN : ACTION_LABELS_TR;
    return labels[action] ?? action;
  };

  const exportCsv = () => {
    if (activities.length === 0) return;
    const rows = activities.map((a) => ({
      time: a.createdAt,
      action: a.action,
      actionLabel: actionLabel(a.action),
      target: a.target ?? "",
      ip: a.ipAddress ?? "",
      userAgent: a.userAgent ?? "",
    }));
    const csv = rowsToCsv(rows, ["time", "action", "actionLabel", "target", "ip", "userAgent"]);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`erpaio-activity-${ts}.csv`, csv);
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <Link href="/dashboard/security" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← {t.common.back}
      </Link>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · {t.activity.brand}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        {t.activity.title}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 1.6, maxWidth: 720 }}>
        {t.activity.description}
      </p>

      {activities.length > 0 && (
        <button
          onClick={exportCsv}
          style={{
            padding: "8px 16px",
            borderRadius: 100,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.text,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 16,
            fontFamily: "inherit",
          }}
        >
          {t.audit.exportCsv}
        </button>
      )}

      <div style={{ maxWidth: 880 }}>
        {error ? (
          <div style={{ color: colors.error, fontSize: 13 }}>⊘ {error}</div>
        ) : loading ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>{t.common.loading}</div>
        ) : activities.length === 0 ? (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, color: colors.textMuted, fontSize: 13 }}>
            {t.activity.emptyTitle}
          </div>
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>{t.activity.colTime}</th>
                  <th style={{ ...th, textAlign: "left" }}>{t.activity.colAction}</th>
                  <th style={th}>{t.activity.colIp}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={td}>{new Date(a.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}</td>
                    <td style={{ ...td, textAlign: "left", fontWeight: 500 }}>{actionLabel(a.action)}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                      {a.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontWeight: 600,
  fontSize: 11,
  color: "#475569",
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  fontSize: 13,
  color: "#0F172A",
};
