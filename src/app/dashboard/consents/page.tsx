"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";

interface ConsentEntry {
  id: string;
  type: string;
  action: string;
  documentVer: string | null;
  context: string | null;
  createdAt: string;
}

const TYPE_LABELS_TR: Record<string, string> = {
  kvkk_signup: "KVKK aydınlatma metni",
  kvkk_marketing: "Pazarlama tercihleri (KVKK)",
  kvkk_cookies: "Çerez tercihleri",
  terms: "Kullanım Koşulları",
  privacy: "Gizlilik Politikası",
};

const TYPE_LABELS_EN: Record<string, string> = {
  kvkk_signup: "KVKK consent notice",
  kvkk_marketing: "Marketing preferences (KVKK)",
  kvkk_cookies: "Cookie preferences",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

const ACTION_LABELS_TR: Record<string, string> = {
  granted: "Onaylandı",
  withdrawn: "Geri çekildi",
};

const ACTION_LABELS_EN: Record<string, string> = {
  granted: "Granted",
  withdrawn: "Withdrawn",
};

const ACTION_COLORS: Record<string, { fg: string; bg: string }> = {
  granted: { fg: "#10B981", bg: "#D1FAE5" },
  withdrawn: { fg: "#EF4444", bg: "#FEE2E2" },
};

export default function ConsentsPage() {
  const { t, locale } = useI18n();
  const [consents, setConsents] = useState<ConsentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/consents")
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.error || t.common.error);
          setLoading(false);
          return;
        }
        const d = await r.json();
        setConsents(d.consents ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t.common.error);
        setLoading(false);
      });
  }, [t.common.error]);

  const typeLabel = (key: string) =>
    (locale === "en" ? TYPE_LABELS_EN : TYPE_LABELS_TR)[key] ?? key;
  const actionLabel = (key: string) =>
    (locale === "en" ? ACTION_LABELS_EN : ACTION_LABELS_TR)[key] ?? key;

  const exportCsv = () => {
    if (consents.length === 0) return;
    const rows = consents.map((c) => ({
      time: c.createdAt,
      type: c.type,
      typeLabel: typeLabel(c.type),
      action: c.action,
      actionLabel: actionLabel(c.action),
      documentVer: c.documentVer ?? "",
      context: c.context ?? "",
    }));
    const csv = rowsToCsv(rows, ["time", "type", "typeLabel", "action", "actionLabel", "documentVer", "context"]);
        downloadCsv(exportFilename("consents", "csv"), csv);
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <Link href="/dashboard/settings" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← {t.common.back}
      </Link>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · {t.consents.brand}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        {t.consents.title}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 1.6, maxWidth: 720 }}>
        {t.consents.description}
      </p>

      {consents.length > 0 && (
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
        ) : consents.length === 0 ? (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, color: colors.textMuted, fontSize: 13 }}>
            {t.consents.emptyTitle}
          </div>
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>{t.consents.colTime}</th>
                  <th style={{ ...th, textAlign: "left" }}>{t.consents.colType}</th>
                  <th style={th}>{t.consents.colAction}</th>
                  <th style={th}>{t.consents.colVersion}</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => {
                  const ac = ACTION_COLORS[c.action] ?? ACTION_COLORS.granted;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={td}>
                        {new Date(c.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                      </td>
                      <td style={{ ...td, textAlign: "left", fontWeight: 500 }}>
                        {typeLabel(c.type)}
                      </td>
                      <td style={td}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 100,
                          background: ac.bg,
                          color: ac.fg,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}>
                          {actionLabel(c.action)}
                        </span>
                      </td>
                      <td style={{ ...td, color: colors.textMuted, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                        {c.documentVer ?? "—"}
                      </td>
                    </tr>
                  );
                })}
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
