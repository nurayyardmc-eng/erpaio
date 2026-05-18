"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setTenants(d.tenants ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  }, []);

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

      {loading && <div style={{ color: "#94A3B8" }}>Yükleniyor...</div>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["Tenant", "Plan", "Kullanıcı", "Bağlantı", "Cache", "Alert", "Token", "Oluşturma"].map((h) => (
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
                        {(t.monthlyTokensUsed / 1000).toFixed(0)}k / {(t.monthlyTokenBudget / 1000).toFixed(0)}k
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
                      {new Date(t.createdAt).toLocaleDateString("tr-TR")}
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
