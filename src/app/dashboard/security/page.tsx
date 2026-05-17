"use client";
import { confirmDialog } from "@/components/Confirm";
import { showToast } from "@/components/Toaster";
import { useEffect, useState } from "react";

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
  const [meEnabled, setMeEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<SetupResp | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
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
        title: "Yeni kurtarma kodları oluştur?",
        message: "Eski kodlar geçersiz olur. Yeni kodları güvenli bir yere kaydedin — bir daha gösterilmeyecek.",
        confirmLabel: "Oluştur",
        destructive: true,
      });
      if (!ok) return;
    }
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/recovery-codes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Hata", "error");
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
    showToast("Kodlar panoya kopyalandı", "success");
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const blob = new Blob(
      [
        "ERPAIO MFA Kurtarma Kodları\n",
        `Oluşturuldu: ${new Date().toLocaleString("tr-TR")}\n\n`,
        "Her kod yalnızca BİR KEZ kullanılabilir. Güvenli bir yerde saklayın.\n\n",
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
    refresh();
    loadSessions();
    loadRecovery();
  }, []);

  const revokeSession = async (s: Session) => {
    if (s.isCurrent) {
      showToast("Aktif oturumunuzu sonlandıramazsınız. Çıkış yapmak için Ayarlar sayfasını kullanın.", "error");
      return;
    }
    const ok = await confirmDialog({
      title: "Oturumu sonlandır?",
      message: `${s.name} cihazı uygulamadan çıkacak. Tekrar giriş yapması gerekecek.`,
      confirmLabel: "Sonlandır",
      destructive: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/me/sessions?tokenId=${s.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Oturum sonlandırıldı", "success");
      loadSessions();
    } else {
      showToast("İşlem başarısız", "error");
    }
  };

  const beginSetup = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ kind: "err", msg: data.error || "Hata" });
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
      setStatus({ kind: "err", msg: data.error || "Kod yanlış" });
      setLoading(false);
      return;
    }
    setStatus({ kind: "ok", msg: "MFA etkin." });
    setSetup(null);
    setCode("");
    refresh();
    setLoading(false);
  };

  const disable = async () => {
    const _ok = await confirmDialog({ title: "MFAyı kapat?", message: "Hesabın daha az güvenli olur.", confirmLabel: "Evet, kapat", destructive: true }); if (!_ok) return;
    setLoading(true);
    await fetch("/api/auth/mfa/setup", { method: "DELETE" });
    setStatus({ kind: "ok", msg: "MFA kapatıldı." });
    refresh();
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · GÜVENLİK</div>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>İki Faktörlü Doğrulama (MFA)</h1>

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
            }}>MFA aktif</div>
            <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              Hesabın iki faktörlü doğrulama ile korunuyor. Her girişte authenticator&apos;dan 6 haneli kod istenir.
            </p>
            <button
              onClick={disable}
              disabled={loading}
              style={btnDanger}
            >
              MFA&apos;yı kapat
            </button>
          </>
        )}

        {meEnabled === false && !setup && (
          <>
            <div style={{ fontSize: 13, color: "#F59E0B", marginBottom: 12 }}>⚠ MFA aktif değil</div>
            <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              Authenticator app (Google Authenticator, 1Password, Authy) kullanarak hesabını güçlendir.
              Pro plan ve üzeri için kullanılabilir.
            </p>
            <button onClick={beginSetup} disabled={loading} style={btnPrimary}>
              {loading ? "Hazırlanıyor..." : "MFA Kurulumu Başlat"}
            </button>
          </>
        )}

        {setup && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
              <strong style={{ color: "#0F172A" }}>1. Adım:</strong> Authenticator app&apos;inle bu QR kodu tara.
            </div>
            <img src={setup.qr} alt="QR" style={{ display: "block", margin: "12px auto", background: "#fff", padding: 8, borderRadius: 8 }} />
            <details style={{ marginBottom: 16 }}>
              <summary style={{ color: "#94A3B8", fontSize: 11, cursor: "pointer" }}>QR taranamıyorsa: manuel kod</summary>
              <code style={{ display: "block", marginTop: 8, padding: 8, background: "#F9FAFB", borderRadius: 4, fontSize: 11, color: "#0A0A0A", wordBreak: "break-all" }}>
                {setup.secret}
              </code>
            </details>

            <form onSubmit={verify}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                <strong style={{ color: "#0F172A" }}>2. Adım:</strong> App&apos;te görünen 6 haneli kodu gir.
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
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
                {loading ? "Doğrulanıyor..." : "Doğrula ve Etkinleştir"}
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
          <h2 style={{ fontSize: 18, margin: "0 0 16px", fontWeight: 600 }}>MFA Kurtarma Kodları</h2>
          <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Authenticator app&apos;ini kaybedersen bu tek kullanımlık kodlarla giriş yapabilirsin.
            Kodlar yalnızca bir kez gösterilir; güvenli bir yerde sakla.
          </p>

          <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
            {recovery && recovery.total > 0 ? (
              <>
                <div style={{ fontSize: 13, color: "#0F172A", marginBottom: 4 }}>
                  <strong>{recovery.remaining}</strong> / {recovery.total} kod kalan
                </div>
                {recovery.generatedAt && (
                  <div style={{ fontSize: 12, color: "#737373", marginBottom: 16 }}>
                    Oluşturuldu: {new Date(recovery.generatedAt).toLocaleString("tr-TR")}
                  </div>
                )}
                {recovery.remaining <= 3 && recovery.remaining > 0 && (
                  <div style={{ fontSize: 12, color: "#F59E0B", marginBottom: 12 }}>
                    ⚠ Az kod kaldı. Yenilemeyi düşün.
                  </div>
                )}
                {recovery.remaining === 0 && (
                  <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>
                    ⚠ Tüm kodlar kullanıldı. Yeni set oluştur.
                  </div>
                )}
                <button onClick={generateRecovery} disabled={recoveryLoading} style={btnDanger}>
                  {recoveryLoading ? "Oluşturuluyor..." : "Yeni Kodlar Oluştur"}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#F59E0B", marginBottom: 12 }}>
                  ⚠ Henüz kurtarma kodun yok
                </div>
                <button onClick={generateRecovery} disabled={recoveryLoading} style={btnPrimary}>
                  {recoveryLoading ? "Oluşturuluyor..." : "Kurtarma Kodlarını Oluştur"}
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
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Kurtarma Kodların</h3>
                <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                  Bu kodlar bir daha gösterilmeyecek. Şimdi indir veya kopyala. Her kod sadece bir kez kullanılabilir.
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
                  <button onClick={downloadRecoveryCodes} style={btnPrimary}>İndir (.txt)</button>
                  <button onClick={copyRecoveryCodes} style={btnSecondary}>Kopyala</button>
                  <button
                    onClick={() => setRecoveryCodes(null)}
                    style={{ ...btnSecondary, marginLeft: "auto" }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aktif Oturumlar */}
      <div style={{ maxWidth: 520, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px", fontWeight: 600 }}>Aktif Oturumlar</h2>
        <p style={{ color: "#525252", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Hesabınıza erişimi olan tüm cihazlar. Tanımadığınız bir oturum görüyorsanız sonlandırın
          ve şifrenizi değiştirin.
        </p>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          {sessionsLoading ? (
            <div style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 16, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, borderRadius: 8, width: "60%" }} />
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#737373", fontSize: 13 }}>
              Aktif oturum yok.
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
                    {s.name}
                    {s.isCurrent && (
                      <span style={{
                        fontSize: 10,
                        color: "#10B981",
                        background: "#D1FAE5",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}>BU OTURUM</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#737373" }}>
                    {s.lastUsedAt
                      ? `Son kullanım: ${new Date(s.lastUsedAt).toLocaleString("tr-TR")}`
                      : "Henüz kullanılmadı"}
                  </div>
                  <div style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>
                    Süre sonu: {new Date(s.expiresAt).toLocaleDateString("tr-TR")}
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
                    Sonlandır
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
