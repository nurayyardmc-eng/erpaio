"use client";
import { useState, useEffect } from "react";
import { Database, Server, ShieldCheck, CheckCircle2, XCircle, Copy, Mail } from "lucide-react";
import { showToast } from "@/components/Toaster";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { colors } from "@/lib/theme";
import { schemaAgeRelative, schemaAgeStatus, type SchemaAgeStatus } from "@/lib/schema/age";
import { isOwnerOrAdmin } from "@/lib/auth/role";
import { postJson } from "@/lib/http/clientFetch";
import { readOnlyUserSql } from "@/lib/db/readOnlyUserSql";
import type { ErpType } from "@/lib/db/erpTypes";

interface Connection {
  id: string;
  erpType: string;
  host: string;
  dbName: string;
  status: string;
  lastSync?: string;
  createdAt: string;
  /** Schema cache snapshot — RRR'de eklendi; eski client'lar görmezden gelir. */
  schemaCache?: { builtAt: string; tableCount: number } | null;
}

// Schema age → renk eşlemesi.
const SCHEMA_AGE_BADGE: Record<Exclude<SchemaAgeStatus, "never">, { fg: string; bg: string; label: string }> = {
  fresh: { fg: "#065F46", bg: "#D1FAE5", label: "GÜNCEL" },
  stale: { fg: "#92400E", bg: "#FEF3C7", label: "ESKİ" },
  "very-stale": { fg: "#991B1B", bg: "#FEE2E2", label: "ÇOK ESKİ" },
};

const ERP_TYPES = [
  { id: "nebim_v3", label: "Nebim V3", desc: "Türkiye perakende standardı (MS SQL)", port: 1433 },
  { id: "sap", label: "SAP", desc: "S/4HANA, ECC (MS SQL veya Oracle)", port: 1433 },
  { id: "dynamics365", label: "Dynamics 365", desc: "Microsoft ERP (MS SQL)", port: 1433 },
  { id: "postgres", label: "PostgreSQL", desc: "Odoo, ERPNext, custom (PG)", port: 5432 },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showSetupSql, setShowSetupSql] = useState(false);
  // Feature 1.3 — Connection test fail edince user-friendly hint gosterir.
  const [lastError, setLastError] = useState<{ title: string; hint: string; category: string } | null>(null);
  const [form, setForm] = useState({
    erpType: "nebim_v3",
    host: "",
    port: 1433,
    dbName: "",
    username: "",
    password: "",
  });

  const refresh = () => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => { setConnections(d); setListLoading(false); });
  };

  useEffect(() => { refresh(); }, []);

  // Fetch role for owner/admin-gated "Sync now" button. Async setState callback
  // arrives later — not synchronous from the effect body.
  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: { user?: { role?: string } } | null) => setUserRole(d?.user?.role ?? null))
      .catch(() => {});
  }, []);

  const canManage = isOwnerOrAdmin(userRole);

  const syncNow = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/connections/${encodeURIComponent(id)}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Schema sync başarısız.", "error");
      } else {
        showToast(`Şema senkronlandı (${data.schemaCache?.tableCount ?? "?"} tablo).`, "success");
        refresh();
      }
    } catch {
      showToast("Schema sync başarısız.", "error");
    } finally {
      setSyncingId(null);
    }
  };

  const onTypeChange = (id: string) => {
    const t = ERP_TYPES.find((x) => x.id === id);
    setForm({ ...form, erpType: id, port: t?.port ?? 1433 });
    // Yeni ERP type seçildiğinde SQL panel'i kapat (içerik değişti)
    setShowSetupSql(false);
  };

  const copySetupSql = async () => {
    const script = readOnlyUserSql(form.erpType as ErpType);
    try {
      await navigator.clipboard.writeText(script.sql);
      showToast("SQL kopyalandı. IT departmanınıza gönderebilirsiniz.", "success");
    } catch {
      showToast("Kopyalama başarısız. Manuel seçip kopyalayın.", "error");
    }
  };

  const emailSetupSql = () => {
    const script = readOnlyUserSql(form.erpType as ErpType);
    const erpLabel = ERP_TYPES.find((x) => x.id === form.erpType)?.label ?? form.erpType;
    const subject = encodeURIComponent(`ERPAIO ${erpLabel} için read-only kullanıcı oluşturma`);
    const body = encodeURIComponent(
      `Merhaba,\n\nERPAIO platformunu ${erpLabel} veritabanımıza bağlamak için aşağıdaki SQL'i çalıştırıp bana erpaio_readonly kullanıcısı ve şifresini iletebilir misiniz?\n\nNotlar: ${script.notes}\n\n--- SQL ---\n\n${script.sql}\n\nTeşekkürler.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLastError(null);
    try {
      const res = await postJson("/api/connections", form);
      const data = await res.json();
      if (!res.ok || !data.id) {
        showToast(data.error || "Bağlantı eklenemedi", "error");
        return;
      }
      showToast("Bağlantı eklendi, test ediliyor…", "info");
      const test = await fetch(`/api/connections/${data.id}/test`);
      const testData = await test.json();
      if (testData.ok) {
        showToast(`Bağlantı başarılı! ${testData.tableCount} tablo bulundu.`, "success");
        setForm({ erpType: "nebim_v3", host: "", port: 1433, dbName: "", username: "", password: "" });
        setShowForm(false);
      } else {
        // Feature 1.3 — backend connectionErrorHint dondurur; UI'da rich panel goster.
        if (testData.hint && testData.error) {
          setLastError({ title: testData.error, hint: testData.hint, category: testData.category ?? "unknown" });
        } else {
          showToast("Bağlantı başarısız. Bilgileri kontrol edin.", "error");
        }
      }
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ağ hatası", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 400,
            letterSpacing: -1,
            margin: "0 0 8px",
          }}>
            ERP Bağlantıları
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            ERP veritabanlarınıza read-only bağlantı kurun. Şifreler AES-256-GCM ile şifrelenir.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: colors.text,
              color: colors.bg,
              padding: "10px 20px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Yeni Bağlantı
          </button>
        )}
      </div>

      {showForm && (
        <div className="elevated" style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 28,
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>Yeni Bağlantı</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 20px" }}>
            Önce ERP tipinizi seçin, sonra bağlantı bilgilerini girin.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
              marginBottom: 20,
            }}>
              {ERP_TYPES.map((t) => {
                const active = form.erpType === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => onTypeChange(t.id)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: active ? colors.brandSoft : colors.bg,
                      border: `1px solid ${active ? colors.text : colors.border}`,
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Database size={14} color={active ? colors.text : colors.textMuted} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 12 }}>
              <Field label="Host / IP">
                <input
                  required
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="db.firma.com"
                  style={inputStyle}
                />
              </Field>
              <Field label="Port">
                <input
                  type="number"
                  required
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Veritabanı Adı">
              <input
                required
                value={form.dbName}
                onChange={(e) => setForm({ ...form, dbName: e.target.value })}
                placeholder="NebimDB"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Kullanıcı Adı">
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="erpaio_readonly"
                  style={inputStyle}
                />
              </Field>
              <Field label="Şifre">
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: colors.bgSubtle,
              borderRadius: 8,
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 16,
              marginBottom: 12,
            }}>
              <ShieldCheck size={14} color={colors.brand} />
              <span>Şifre AES-256-GCM ile şifrelenir. Sadece SELECT yetkisi olan kullanıcı önerilir.</span>
            </div>

            {/* Read-only user setup helper — IT'ye kopyala-yapıştır SQL */}
            <button
              type="button"
              onClick={() => setShowSetupSql((v) => !v)}
              style={{
                background: "transparent",
                color: colors.brand,
                border: "none",
                padding: 0,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                marginBottom: 16,
                textDecoration: "underline",
              }}
            >
              {showSetupSql ? "Kullanıcı oluşturma SQL'ini gizle" : "IT'ye göndermek için kullanıcı oluşturma SQL'ini göster"}
            </button>

            {showSetupSql && (
              <div style={{
                background: colors.bgSubtle,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, color: colors.textMuted, margin: "0 0 12px", lineHeight: 1.5 }}>
                  {readOnlyUserSql(form.erpType as ErpType).notes}
                </p>
                <pre style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains-mono), Menlo, monospace",
                  overflow: "auto",
                  margin: "0 0 12px",
                  maxHeight: 240,
                  whiteSpace: "pre-wrap",
                }}>
                  {readOnlyUserSql(form.erpType as ErpType).sql}
                </pre>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={copySetupSql}
                    style={{
                      background: colors.text,
                      color: colors.bg,
                      border: "none",
                      borderRadius: 100,
                      padding: "8px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Copy size={12} /> SQL&apos;i Kopyala
                  </button>
                  <button
                    type="button"
                    onClick={emailSetupSql}
                    style={{
                      background: "transparent",
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 100,
                      padding: "8px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Mail size={12} /> IT&apos;ye E-posta Hazırla
                  </button>
                </div>
              </div>
            )}

            {/* Feature 1.3 — Connection test fail edince rich error panel
                (firewall hint, auth hint, vb). Toast yerine kalıcı görünür. */}
            {lastError && (
              <div style={{
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <XCircle size={18} color="#B91C1C" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#7F1D1D", marginBottom: 4 }}>
                      {lastError.title}
                    </div>
                    <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {lastError.hint}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastError(null)}
                    aria-label="Kapat"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#7F1D1D",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: colors.text,
                  color: colors.bg,
                  border: "none",
                  borderRadius: 100,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Bağlanıyor…" : "Bağlantıyı Test Et ve Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: "transparent",
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 100,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {listLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={68} />)}
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={<Server size={28} />}
          title="Henüz bağlantı yok"
          description="Yukarıdaki butonla ilk ERP bağlantınızı ekleyin. Şema 30 saniyede taranır."
        />
      ) : (
        <div>
          <div style={{
            color: colors.textSubtle,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Mevcut Bağlantılar ({connections.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {connections.map((conn) => {
              const isActive = conn.status === "active";
              const builtAt = conn.schemaCache?.builtAt ?? null;
              const ageStatus = schemaAgeStatus(builtAt);
              const ageRel = schemaAgeRelative(builtAt);
              const ageBadge = ageStatus !== "never" ? SCHEMA_AGE_BADGE[ageStatus] : null;
              return (
                <div key={conn.id} className="elevated" style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      background: colors.brandSoft,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Database size={16} color={colors.brand} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{conn.dbName}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>
                        {conn.host} · {conn.erpType}
                      </div>
                      {/* Schema cache age — Track RRR. AI sorgu üretimi bu snapshot'a göre çalışır. */}
                      {ageStatus === "never" ? (
                        <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic", marginTop: 4 }}>
                          henüz şema sync&apos;i yok
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          {ageBadge && (
                            <span style={{
                              fontSize: 10,
                              letterSpacing: 0.8,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: ageBadge.bg,
                              color: ageBadge.fg,
                            }}>
                              {ageBadge.label}
                            </span>
                          )}
                          {conn.schemaCache?.tableCount !== undefined && (
                            <span style={{ fontSize: 11, color: colors.textMuted }}>
                              {conn.schemaCache.tableCount} tablo
                            </span>
                          )}
                          {ageRel && (
                            <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>
                              {ageRel.value}
                              {ageRel.unit === "hour" ? " saat önce" : " gün önce"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: isActive ? "#D1FAE5" : "#FEE2E2",
                      color: isActive ? "#10B981" : "#EF4444",
                      fontWeight: 600,
                    }}>
                      {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {isActive ? "Aktif" : conn.status}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => syncNow(conn.id)}
                        disabled={syncingId === conn.id}
                        title="ERP schema'yı yeniden tarayıp cache'i güncelle"
                        style={{
                          background: "transparent",
                          border: `1px solid ${colors.border}`,
                          borderRadius: 100,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 600,
                          color: syncingId === conn.id ? "#94A3B8" : colors.text,
                          cursor: syncingId === conn.id ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {syncingId === conn.id ? "Senkronize ediliyor..." : "Şimdi senkronize et"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: "block",
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: 500,
        marginBottom: 4,
      }}>{label}</label>
      {children}
    </div>
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
  outline: "none",
  boxSizing: "border-box",
};
