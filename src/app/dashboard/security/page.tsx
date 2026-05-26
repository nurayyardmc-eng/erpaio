"use client";
import { confirmDialog } from "@/components/Confirm";
import { showToast } from "@/components/Toaster";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { formatTimestamp } from "@/lib/format/time";

interface SetupResp { secret: string; qr: string; uri: string }
interface Session {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}
interface RecoveryStatus {
  total: number;
  remaining: number;
  generatedAt: string | null;
}

export default function SecurityPage() {
  const { t } = useI18n();
  const [meEnabled, setMeEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<SetupResp | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  // Track FFFF — inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [recovery, setRecovery] = useState<RecoveryStatus | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const refresh = () => {
    fetch("/api/me").then(r => r.json()).then(d => {
      setMeEnabled(Boolean(d.user?.totpEnabled));
    });
  };

  const loadSessions = () => {
    setSessionsLoading(true);
    fetch("/api/me/sessions")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setSessions(d.sessions ?? []);
        setSessionsLoading(false);
      })
      .catch(() => setSessionsLoading(false));
  };

  const loadRecovery = () => {
    fetch("/api/auth/mfa/recovery-codes")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: RecoveryStatus | null) => setRecovery(d))
      .catch(() => {});
  };

  const generateRecovery = async () => {
    if (recovery && recovery.total > 0) {
      const ok = await confirmDialog({
        title: t.security.recoveryRotateConfirmTitle,
        message: t.security.recoveryRotateConfirmMessage,
        confirmLabel: t.security.recoveryRotateConfirmYes,
        destructive: true,
      });
      if (!ok) return;
    }
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/recovery-codes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.common.error, "error");
        return;
      }
      setRecoveryCodes(data.codes as string[]);
      loadRecovery();
    } finally {
      setRecoveryLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return;
    void navigator.clipboard.writeText(recoveryCodes.join("\n"));
    showToast(t.security.recoveryCopiedToast, "success");
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const blob = new Blob(
      [
        `${t.security.recoveryFileHeader}\n`,
        `${t.security.recoveryFileCreatedPrefix}${new Date().toLocaleString("tr-TR")}\n\n`,
        `${t.security.recoveryFileNotice}\n\n`,
        recoveryCodes.join("\n"),
        "\n",
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erpaio-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Mount-only hydration of MFA state, sessions, and recovery codes via async fetches.
    refresh();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
    loadRecovery();
  }, []);

  const revokeSession = async (s: Session) => {
    if (s.isCurrent) {
      showToast(t.security.sessionRevokeCurrentBlocked, "error");
      return;
    }
    const ok = await confirmDialog({
      title: t.security.sessionRevokeConfirmTitlePrefix,
      message: `${s.name}${t.security.sessionRevokeConfirmMessage}`,
      confirmLabel: t.security.sessionRevokeConfirmYes,
      destructive: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/me/sessions?tokenId=${s.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast(t.security.sessionRevokeOk, "success");
      loadSessions();
    } else {
      showToast(t.security.sessionRevokeFailed, "error");
    }
  };

  // Track FFFF — inline rename helpers
  const startRename = (s: Session) => {
    setRenamingId(s.id);
    setRenameValue(s.name);
  };
  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };
  const saveRename = async (s: Session) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === s.name) {
      cancelRename();
      return;
    }
    // Optimistic update
    setSessions((prev) => prev.map((p) => (p.id === s.id ? { ...p, name: trimmed } : p)));
    setRenamingId(null);
    try {
      const res = await fetch("/api/me/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: s.id, name: trimmed }),
      });
      if (!res.ok) {
        // Revert
        setSessions((prev) => prev.map((p) => (p.id === s.id ? { ...p, name: s.name } : p)));
        showToast(t.security.sessionRenameFailed, "error");
      } else {
        showToast(t.security.sessionRenamedToast, "success");
      }
    } catch {
      setSessions((prev) => prev.map((p) => (p.id === s.id ? { ...p, name: s.name } : p)));
      showToast(t.security.sessionRenameFailed, "error");
    }
  };

  const beginSetup = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ kind: "err", msg: data.error || t.common.error });
      setLoading(false);
      return;
    }
    setSetup(data);
    setLoading(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/mfa/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ kind: "err", msg: data.error || t.security.setupCodeInvalid });
      setLoading(false);
      return;
    }
    setStatus({ kind: "ok", msg: t.security.setupEnabledOk });
    setSetup(null);
    setCode("");
    refresh();
    setLoading(false);
  };

  const disable = async () => {
    const _ok = await confirmDialog({ title: t.security.disableConfirmTitle, message: t.security.disableConfirmMessage, confirmLabel: t.security.disableConfirmYes, destructive: true }); if (!_ok) return;
    setLoading(true);
    await fetch("/api/auth/mfa/setup", { method: "DELETE" });
    setStatus({ kind: "ok", msg: t.security.disableOk });
    refresh();
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>{t.security.breadcrumb}</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>{t.security.title}</h1>

      <div style={{ maxWidth: 520, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24 }}>
        {meEnabled === null && <div className="skeleton" style={{ height: 16, borderRadius: 8, width: 200 }} />}

        {meEnabled === true && !setup && (
          <>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#10B981",
              background: "#D1FAE5",
              padding: "4px 10px",
              borderRadius: 999,
              marginBottom: 12,
              fontWeight: 500,
            }}>{t.security.mfaActive}</div>
            <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              {t.security.mfaActiveDesc}
            </p>
            <button
              onClick={disable}
              disabled={loading}
              style={btnDanger}
            >
              {t.security.mfaDisable}
            </button>
          </>
        )}

        {meEnabled === false && !setup && (
          <>
            <div style={{ fontSize: 13, color: "#F59E0B", marginBottom: 12 }}>{t.security.mfaInactive}</div>
            <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              {t.security.mfaInactiveDesc}
            </p>
            <button onClick={beginSetup} disabled={loading} style={btnPrimary}>
              {loading ? t.security.mfaPreparing : t.security.mfaStartSetup}
            </button>
          </>
        )}

        {setup && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
              <strong style={{ color: "#0F172A" }}>{t.security.setupStep1}</strong> {t.security.setupStep1Label}
            </div>
            {/* TOTP QR is a runtime-generated data URL with fixed size; next/image adds no benefit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt={t.security.setupQrAlt} style={{ display: "block", margin: "12px auto", background: "#fff", padding: 8, borderRadius: 8 }} />
            <details style={{ marginBottom: 16 }}>
              <summary style={{ color: "#94A3B8", fontSize: 11, cursor: "pointer" }}>{t.security.setupManualCode}</summary>
              <code style={{ display: "block", marginTop: 8, padding: 8, background: "#F9FAFB", borderRadius: 4, fontSize: 11, color: "#0A0A0A", wordBreak: "break-all" }}>
                {setup.secret}
              </code>
            </details>

            <form onSubmit={verify}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                <strong style={{ color: "#0F172A" }}>{t.security.setupStep2}</strong> {t.security.setupStep2Label}
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t.security.setupCodePlaceholder}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{
                  width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB",
                  borderRadius: 6, padding: "10px 12px", color: "#0F172A",
                  fontSize: 18, fontFamily: "inherit", textAlign: "center",
                  letterSpacing: 6, boxSizing: "border-box", outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{ ...btnPrimary, marginTop: 12, width: "100%" }}
              >
                {loading ? t.security.setupVerifying : t.security.setupVerify}
              </button>
            </form>
          </div>
        )}

        {status && (
          <div style={{ marginTop: 16, color: status.kind === "ok" ? "#10B981" : "#EF4444", fontSize: 12 }}>
            {status.msg}
          </div>
        )}
      </div>

      {/* MFA Kurtarma Kodları */}
      {meEnabled === true && (
        <div style={{ maxWidth: 520, marginTop: 32 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 16px", fontWeight: 600 }}>{t.security.recoveryTitle}</h2>
          <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            {t.security.recoveryDescription}
          </p>

          <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
            {recovery && recovery.total > 0 ? (
              <>
                <div style={{ fontSize: 13, color: "#0F172A", marginBottom: 4 }}>
                  <strong>{recovery.remaining}</strong>{t.security.recoveryRemainingMid}{recovery.total}{t.security.recoveryRemainingSuffix}
                </div>
                {recovery.generatedAt && (
                  <div style={{ fontSize: 12, color: "#737373", marginBottom: 16 }}>
                    {t.security.recoveryGeneratedPrefix}{formatTimestamp(recovery.generatedAt)}
                  </div>
                )}
                {recovery.remaining <= 3 && recovery.remaining > 0 && (
                  <div style={{ fontSize: 12, color: "#F59E0B", marginBottom: 12 }}>
                    {t.security.recoveryWarnLow}
                  </div>
                )}
                {recovery.remaining === 0 && (
                  <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>
                    {t.security.recoveryWarnExhausted}
                  </div>
                )}
                <button onClick={generateRecovery} disabled={recoveryLoading} style={btnDanger}>
                  {recoveryLoading ? t.security.recoveryGenerating : t.security.recoveryGenerateNew}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#F59E0B", marginBottom: 12 }}>
                  {t.security.recoveryNoneTitle}
                </div>
                <button onClick={generateRecovery} disabled={recoveryLoading} style={btnPrimary}>
                  {recoveryLoading ? t.security.recoveryGenerating : t.security.recoveryGenerateFirst}
                </button>
              </>
            )}
          </div>

          {/* One-time view modal */}
          {recoveryCodes && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                zIndex: 1000,
              }}
            >
              <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{t.security.recoveryModalTitle}</h3>
                <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                  {t.security.recoveryModalDescription}
                </p>
                <div
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                    fontFamily: "ui-monospace, Menlo, Monaco, monospace",
                    fontSize: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    color: "#0F172A",
                  }}
                >
                  {recoveryCodes.map((c) => (
                    <div key={c} style={{ letterSpacing: 1 }}>{c}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={downloadRecoveryCodes} style={btnPrimary}>{t.security.recoveryDownload}</button>
                  <button onClick={copyRecoveryCodes} style={btnSecondary}>{t.security.recoveryCopy}</button>
                  <button
                    onClick={() => setRecoveryCodes(null)}
                    style={{ ...btnSecondary, marginLeft: "auto" }}
                  >
                    {t.security.recoveryClose}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity log link */}
      <div style={{ maxWidth: 520, marginTop: 32 }}>
        <a
          href="/dashboard/activity"
          style={{
            display: "block",
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: 20,
            textDecoration: "none",
            color: "#0F172A",
            transition: "border-color 0.15s",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            {t.activity.linkLabel} →
          </div>
          <div style={{ fontSize: 13, color: "#525252" }}>
            {t.activity.linkDescription}
          </div>
        </a>
      </div>

      {/* Aktif Oturumlar */}
      <div style={{ maxWidth: 520, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px", fontWeight: 600 }}>{t.security.sessionsTitle}</h2>
        <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {t.security.sessionsDescription}
        </p>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          {sessionsLoading ? (
            <div style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 16, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, borderRadius: 8, width: "60%" }} />
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#737373", fontSize: 13 }}>
              {t.security.sessionsEmpty}
            </div>
          ) : (
            sessions.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderTop: i === 0 ? "none" : "1px solid #E5E7EB",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    {renamingId === s.id ? (
                      <>
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(s);
                            if (e.key === "Escape") cancelRename();
                          }}
                          autoFocus
                          maxLength={80}
                          style={{
                            fontSize: 13, padding: "4px 8px", borderRadius: 6,
                            border: "1px solid #CBD5E1", flex: 1, outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <button onClick={() => saveRename(s)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid #0A0A0A", background: "#0A0A0A", color: "#FFFFFF", cursor: "pointer", fontFamily: "inherit" }}>
                          {t.security.sessionRenameSave}
                        </button>
                        <button onClick={cancelRename} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #CBD5E1", background: "transparent", color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
                          {t.common.cancel}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{s.name}</span>
                        <button
                          onClick={() => startRename(s)}
                          title={t.security.sessionRenameBtn}
                          aria-label={t.security.sessionRenameBtn}
                          style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          ✏︎
                        </button>
                      </>
                    )}
                    {s.isCurrent && (
                      <span style={{
                        fontSize: 10,
                        color: "#10B981",
                        background: "#D1FAE5",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}>{t.security.sessionsCurrent}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#737373" }}>
                    {s.lastUsedAt
                      ? `${t.security.sessionsLastUsed}${formatTimestamp(s.lastUsedAt)}`
                      : t.security.sessionsNeverUsed}
                  </div>
                  <div style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>
                    {t.security.sessionsExpires}{new Date(s.expiresAt).toLocaleDateString("tr-TR")}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revokeSession(s)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "transparent",
                      color: "#EF4444",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t.security.sessionRevoke}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#0A0A0A18",
  border: "1px solid #0A0A0A40",
  borderRadius: 6,
  padding: "10px 20px",
  color: "#0A0A0A",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnDanger: React.CSSProperties = {
  background: "rgba(255,107,107,0.1)",
  border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 6,
  padding: "10px 20px",
  color: "#EF4444",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSecondary: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 6,
  padding: "10px 20px",
  color: "#0F172A",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
