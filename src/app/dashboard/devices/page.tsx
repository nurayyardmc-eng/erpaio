"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { colors } from "@/lib/theme";
import { showToast } from "@/components/Toaster";
import { confirmDialog } from "@/components/Confirm";

interface Device {
  id: string;
  platform: string;
  deviceName: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean; // web'de her zaman false (currentToken yok)
}

export default function DevicesPage() {
  const { t, locale } = useI18n();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = () => {
    fetch("/api/me/devices")
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.error || t.common.error);
          return;
        }
        const d = await r.json();
        setDevices(d.devices ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t.common.error));
  };

  useEffect(() => {
    load();
    // load is stable; deps intentionally empty — t.common.error captured at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revoke = async (d: Device) => {
    const name = d.deviceName || t.devices.unnamedDevice;
    const ok = await confirmDialog({
      title: t.devices.revokeConfirmTitle,
      message: `${t.devices.revokeConfirmMessagePrefix}${name}${t.devices.revokeConfirmMessageSuffix}`,
      confirmLabel: t.devices.revokeConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setRevoking(d.id);
    try {
      const res = await fetch(`/api/me/devices?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
      if (!res.ok) {
        showToast(t.devices.revokeFailedToast, "error");
      } else {
        showToast(t.devices.revokedToast, "success");
        setDevices((prev) => prev?.filter((p) => p.id !== d.id) ?? null);
      }
    } catch {
      showToast(t.devices.revokeFailedToast, "error");
    } finally {
      setRevoking(null);
    }
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  return (
    <div style={{ minHeight: "100vh", background: colors.bgSubtle, color: colors.text, padding: 40 }}>
      <Link href="/dashboard/settings" style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← {t.common.back}
      </Link>
      <div style={{ color: colors.text, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · {t.devices.brand}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        {t.devices.title}
      </h1>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 720 }}>
        {t.devices.description}
      </p>

      <div style={{ maxWidth: 880 }}>
        {error ? (
          <div style={{ color: colors.error, fontSize: 13 }}>⊘ {error}</div>
        ) : devices === null ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>{t.common.loading}</div>
        ) : devices.length === 0 ? (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ color: colors.text, fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              {t.devices.emptyTitle}
            </div>
            <div style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.5 }}>
              {t.devices.emptyDesc}
            </div>
          </div>
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ ...th, textAlign: "left" }}>{t.devices.colDeviceName}</th>
                  <th style={th}>{t.devices.colPlatform}</th>
                  <th style={th}>{t.devices.colLastSeen}</th>
                  <th style={th}>{t.devices.colCreatedAt}</th>
                  <th style={th}>{t.devices.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 500 }}>
                      {d.deviceName || t.devices.unnamedDevice}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontSize: 11, color: colors.textMuted }}>
                      {d.platform}
                    </td>
                    <td style={{ ...td, color: colors.textMuted }}>{fmtDate(d.lastSeenAt)}</td>
                    <td style={{ ...td, color: colors.textMuted }}>{fmtDate(d.createdAt)}</td>
                    <td style={td}>
                      <button
                        onClick={() => revoke(d)}
                        disabled={revoking === d.id}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 100,
                          border: `1px solid ${colors.error}`,
                          background: "transparent",
                          color: colors.error,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: revoking === d.id ? "not-allowed" : "pointer",
                          opacity: revoking === d.id ? 0.5 : 1,
                          fontFamily: "inherit",
                        }}
                      >
                        {revoking === d.id ? t.devices.revokingBtn : t.devices.revokeBtn}
                      </button>
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
