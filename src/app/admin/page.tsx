"use client";
import { useEffect, useState } from "react";

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
      <div style={{ minHeight: "100vh", background: "#07090F", color: "#FF6B6B", fontFamily: "monospace", padding: 40 }}>
        <h1 style={{ fontSize: 18 }}>⊘ {error}</h1>
        <p style={{ color: "#3A4558", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "#E8EDF5", fontFamily: "monospace", padding: 40 }}>
      <div style={{ color: "#FF9500", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · ADMIN</div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Tenant Yönetimi</h1>
      <p style={{ color: "#3A4558", fontSize: 11, marginBottom: 24 }}>
        Sistem geneli görünüm — tüm tenant&apos;lar.
      </p>

      {loading && <div style={{ color: "#3A4558" }}>Yükleniyor...</div>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["Tenant", "Plan", "Kullanıcı", "Bağlantı", "Cache", "Alert", "Token", "Oluşturma"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#00E5FF", borderBottom: "1px solid #131A26", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const usagePct = (t.monthlyTokensUsed / t.monthlyTokenBudget) * 100;
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #0C1018" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: "#E8EDF5" }}>{t.name}</div>
                      <div style={{ color: "#3A4558", fontSize: 9 }}>{t.slug}</div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#9C8AFF" }}>{t.plan}</td>
                    <td style={{ padding: "8px 10px", color: "#9AA5B4" }}>{t._count.users}</td>
                    <td style={{ padding: "8px 10px", color: "#9AA5B4" }}>{t._count.connections}</td>
                    <td style={{ padding: "8px 10px", color: "#9AA5B4" }}>{t._count.queryCache}</td>
                    <td style={{ padding: "8px 10px", color: "#9AA5B4" }}>{t._count.alerts}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: usagePct > 80 ? "#FF6B6B" : usagePct > 50 ? "#FFD740" : "#9AA5B4" }}>
                        {(t.monthlyTokensUsed / 1000).toFixed(0)}k / {(t.monthlyTokenBudget / 1000).toFixed(0)}k
                      </div>
                      <div style={{ height: 3, background: "#131A26", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, usagePct)}%`,
                          background: usagePct > 80 ? "#FF6B6B" : usagePct > 50 ? "#FFD740" : "#69FF47",
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#3A4558", fontSize: 9 }}>
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
