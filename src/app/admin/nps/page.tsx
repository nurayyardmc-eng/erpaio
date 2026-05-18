"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Sysadmin NPS dashboard — Track VVVV. /api/nps GET cross-tenant aggregate
 * zaten vardı ama UI eksik. SSSS+TTTT NPS pipeline'ı aktive ettikten sonra
 * platform genelinde sentiment görmek için bu sayfa.
 *
 * UUUU /dashboard/settings → tenant kendi org'unu görür (owner/admin).
 * Buradaki sayfa tüm tenant'ları kapsar (sysadmin gate'i server'da).
 */

interface NpsResponse {
  score: number;
  comment: string | null;
  respondedAt: string;
  tenantId: string;
  tenant: { name: string };
}

interface TenantAggregate {
  tenantId: string;
  name: string;
  total: number;
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
}

interface NpsData {
  nps: number;
  breakdown: { promoters: number; passives: number; detractors: number; total: number };
  responses: NpsResponse[];
  tenants: TenantAggregate[];
}

export default function AdminNpsPage() {
  const [data, setData] = useState<NpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/nps")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  const scoreColor = (n: number): string =>
    n >= 30 ? "#10B981" : n >= 0 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · NPS</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>NPS Dashboard</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 24 }}>
        Platform geneli Net Promoter Score. Son 200 yanıt. -100 (kötü) ile +100 (mükemmel) arası;
        30+ sağlıklı kabul edilir. Tenant tablosu en unhappy önce sıralı.
      </p>

      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : !data ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Veri yok.</div>
      ) : (
        <>
          {/* Global summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
            <div style={summaryCard}>
              <div style={summaryLabel}>Global NPS</div>
              <div style={{ ...summaryValue, color: scoreColor(data.nps) }}>
                {data.nps > 0 ? "+" : ""}{data.nps}
              </div>
            </div>
            <div style={summaryCard}>
              <div style={summaryLabel}>Toplam yanıt</div>
              <div style={summaryValue}>{data.breakdown.total}</div>
            </div>
            <div style={summaryCard}>
              <div style={summaryLabel}>Promoter</div>
              <div style={{ ...summaryValue, color: "#10B981" }}>{data.breakdown.promoters}</div>
            </div>
            <div style={summaryCard}>
              <div style={summaryLabel}>Pasif</div>
              <div style={{ ...summaryValue, color: "#737373" }}>{data.breakdown.passives}</div>
            </div>
            <div style={summaryCard}>
              <div style={summaryLabel}>Detractor</div>
              <div style={{ ...summaryValue, color: "#EF4444" }}>{data.breakdown.detractors}</div>
            </div>
          </div>

          {/* Tenant breakdown */}
          {data.tenants.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0 12px" }}>Tenant başına</h2>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      <th style={{ ...th, textAlign: "left" }}>Tenant</th>
                      <th style={th}>NPS</th>
                      <th style={th}>Yanıt</th>
                      <th style={th}>P</th>
                      <th style={th}>=</th>
                      <th style={th}>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenants.map((t) => (
                      <tr key={t.tenantId} style={{ borderBottom: "1px solid #E5E7EB" }}>
                        <td style={{ ...td, textAlign: "left" }}>{t.name}</td>
                        <td style={{ ...td, fontWeight: 700, color: scoreColor(t.nps) }}>
                          {t.nps > 0 ? "+" : ""}{t.nps}
                        </td>
                        <td style={td}>{t.total}</td>
                        <td style={{ ...td, color: "#10B981" }}>{t.promoters}</td>
                        <td style={{ ...td, color: "#737373" }}>{t.passives}</td>
                        <td style={{ ...td, color: "#EF4444" }}>{t.detractors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Comments — son 30 yorum-içeren yanıt */}
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0 12px" }}>Son yorumlar</h2>
          {data.responses.filter((r) => r.comment).length === 0 ? (
            <div style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>Yorum bırakılmış yanıt yok.</div>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
              {data.responses.filter((r) => r.comment).slice(0, 30).map((r, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${r.score >= 9 ? "#10B981" : r.score >= 7 ? "#F59E0B" : "#EF4444"}`,
                    paddingLeft: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    <strong>{r.score}/10</strong> · {r.tenant.name} · {new Date(r.respondedAt).toLocaleString("tr-TR")}
                  </div>
                  <div style={{ fontSize: 13, color: "#0F172A", marginTop: 4 }}>{r.comment}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const summaryCard: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  padding: 16,
};

const summaryLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#475569",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const summaryValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
};

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
