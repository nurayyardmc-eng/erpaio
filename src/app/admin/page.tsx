"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format/time";
import { exportFilename } from "@/lib/format/exportFilename";
import { formatTokens } from "@/lib/budget/format";

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  monthlyTokenBudget: number;
  monthlyTokensUsed: number;
  budgetResetAt: string;
  trialEndsAt: string | null;
  createdAt: string;
  _count: { users: number; connections: number; alerts: number; queryCache: number };
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string>("");
  const [editBudget, setEditBudget] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/tenants");
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Yetkisiz");
      } else {
        setTenants(d.tenants ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/tenants");
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) setError(d.error || "Yetkisiz");
        else setTenants(d.tenants ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hata");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sprint F.2 — sysadmin mutation handler. Validates inputs client-side
  // and trusts the server zod schema for the final pass. Refreshes the
  // table on success so the new plan/budget shows immediately.
  const submitEdit = async (id: string, kind: "save" | "reset") => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id };
      if (kind === "save") {
        if (editPlan) body.plan = editPlan;
        const budgetNum = Number(editBudget);
        if (editBudget && Number.isFinite(budgetNum) && budgetNum > 0) {
          body.monthlyTokenBudget = budgetNum;
        }
      } else {
        body.resetTokensUsed = true;
      }
      const r = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Patch failed");
      } else {
        setEditing(null);
        setEditPlan("");
        setEditBudget("");
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#EF4444", fontFamily: "inherit", padding: 40 }}>
        <h1 style={{ fontSize: 18 }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <div style={{ color: "#F59E0B", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · ADMIN</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Tenant Yönetimi</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 16 }}>
        Sistem geneli görünüm — tüm tenant&apos;lar.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {([
          { href: "/admin/health-scores", label: "Health Scores" },
          { href: "/admin/nps", label: "NPS" },
          { href: "/admin/cron-runs", label: "Cron Runs" },
          { href: "/admin/slow-queries", label: "Slow Queries" },
          { href: "/admin/notifications", label: "Notifications" },
          { href: "/admin/activity", label: "Activity Log" },
          { href: "/admin/key-history", label: "Encryption Keys" },
          { href: "/admin/readiness", label: "Setup Checklist" },
        ] as const).map((l) => (
          <Link key={l.href} href={l.href} style={{
            padding: "6px 12px",
            borderRadius: 100,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            color: "#0F172A",
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
          }}>
            {l.label} →
          </Link>
        ))}
      </div>

      {tenants.length > 0 && (
        <button
          onClick={() => {
            /* Track TT — sysadmin tenant listesi CSV (monthly report / BI). */
            const rows = tenants.map((t) => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
              plan: t.plan,
              tokensUsed: t.monthlyTokensUsed,
              tokensBudget: t.monthlyTokenBudget,
              users: t._count.users,
              connections: t._count.connections,
              alerts: t._count.alerts,
              queryCache: t._count.queryCache,
              trialEndsAt: t.trialEndsAt ?? "",
              createdAt: t.createdAt,
            }));
            const csv = rowsToCsv(rows, ["id", "name", "slug", "plan", "tokensUsed", "tokensBudget", "users", "connections", "alerts", "queryCache", "trialEndsAt", "createdAt"]);
            downloadCsv(exportFilename("tenants", "csv"), csv);
          }}
          style={{ marginBottom: 16, padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          ↓ CSV ({tenants.length})
        </button>
      )}

      {loading && <div style={{ color: "#94A3B8" }}>Yükleniyor...</div>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["Tenant", "Plan", "Kullanıcı", "Bağlantı", "Cache", "Alert", "Token", "Oluşturma", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#0A0A0A", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const usagePct = (t.monthlyTokensUsed / t.monthlyTokenBudget) * 100;
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #FFFFFF" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: "#0F172A" }}>{t.name}</div>
                      <div style={{ color: "#94A3B8", fontSize: 9 }}>{t.slug}</div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#9C8AFF" }}>{t.plan}</td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{t._count.users}</td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{t._count.connections}</td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{t._count.queryCache}</td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{t._count.alerts}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: usagePct > 80 ? "#EF4444" : usagePct > 50 ? "#F59E0B" : "#475569" }}>
                        {formatTokens(t.monthlyTokensUsed)} / {formatTokens(t.monthlyTokenBudget)}
                      </div>
                      <div style={{ height: 3, background: "#E5E7EB", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, usagePct)}%`,
                          background: usagePct > 80 ? "#EF4444" : usagePct > 50 ? "#F59E0B" : "#10B981",
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#94A3B8", fontSize: 9 }}>
                      {formatDate(t.createdAt)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {editing === t.id ? (
                        <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <select
                            value={editPlan}
                            onChange={(e) => setEditPlan(e.target.value)}
                            style={{ fontSize: 10, padding: "2px 4px", border: "1px solid #E5E7EB", borderRadius: 4 }}
                          >
                            <option value="">(plan)</option>
                            <option value="starter">starter</option>
                            <option value="pro">pro</option>
                            <option value="enterprise">enterprise</option>
                          </select>
                          <input
                            type="number"
                            placeholder="budget"
                            value={editBudget}
                            onChange={(e) => setEditBudget(e.target.value)}
                            style={{ width: 90, fontSize: 10, padding: "2px 4px", border: "1px solid #E5E7EB", borderRadius: 4 }}
                          />
                          <button disabled={saving} onClick={() => submitEdit(t.id, "save")} style={{ fontSize: 10, padding: "2px 8px", background: "#0A0A0A", color: "#FFFFFF", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer" }}>Kaydet</button>
                          <button disabled={saving} onClick={() => submitEdit(t.id, "reset")} title="Token sayacını sıfırla" style={{ fontSize: 10, padding: "2px 6px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 4, cursor: saving ? "wait" : "pointer" }}>↻ token</button>
                          <button disabled={saving} onClick={() => { setEditing(null); setEditPlan(""); setEditBudget(""); }} style={{ fontSize: 10, padding: "2px 6px", background: "transparent", color: "#94A3B8", border: "none", cursor: "pointer" }}>×</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditing(t.id); setEditPlan(t.plan); setEditBudget(String(t.monthlyTokenBudget)); }}
                          style={{ fontSize: 10, padding: "2px 8px", background: "transparent", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 4, cursor: "pointer" }}
                        >
                          Düzenle
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
