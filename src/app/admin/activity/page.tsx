"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rowsToCsv, downloadCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/format/exportFilename";

interface Activity {
  id: string;
  userId: string | null;
  tenantId: string | null;
  email: string | null;
  action: string;
  target: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  tenant: { name: string } | null;
}

interface BreakdownEntry {
  action: string;
  count: number;
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");

  const load = (action?: string) => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (action) qs.set("action", action);

    fetch(`/api/admin/activity?${qs.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Yetkisiz");
          setLoading(false);
          return;
        }
        setActivities(d.activities ?? []);
        setBreakdown(d.breakdown ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Hata");
        setLoading(false);
      });
  };

  // Initial load on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 40 }}>
        <h1 style={{ fontSize: 18, color: "#EF4444" }}>⊘ {error}</h1>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>Bu sayfa yalnızca sistem yöneticilerine açıktır.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit", padding: 40 }}>
      <Link href="/admin" style={{ color: "#737373", fontSize: 13, marginBottom: 16, display: "inline-block" }}>
        ← Admin
      </Link>
      <div style={{ color: "#0A0A0A", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ERPAIO · ACTIVITY LOG</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>Cross-Tenant Aktivite Logu</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 32 }}>
        KVKK md. 13 + GDPR Art. 30 — hassas hesap mutasyonlarının kurumsal audit trail&apos;i.
      </p>

      {/* Son 24h breakdown */}
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Son 24 saat — action breakdown</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 32 }}>
        {breakdown.length === 0 ? (
          <div style={{ color: "#737373", fontSize: 13 }}>Son 24 saatte aktivite yok.</div>
        ) : (
          breakdown.map((b) => (
            <button
              key={b.action}
              onClick={() => {
                setActionFilter(b.action);
                load(b.action);
              }}
              style={{
                background: actionFilter === b.action ? "#0A0A0A" : "#FFFFFF",
                color: actionFilter === b.action ? "#FFFFFF" : "#0F172A",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: 12,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 11, color: actionFilter === b.action ? "#94A3B8" : "#475569", letterSpacing: 0.5 }}>
                {b.action}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{b.count}</div>
            </button>
          ))
        )}
      </div>

      {/* Reset filter + CSV (Track WW) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
      {activities.length > 0 && (
        <button
          onClick={() => {
            const rows = activities.map((a) => ({
              time: a.createdAt,
              tenant: a.tenant?.name ?? a.tenantId ?? "",
              email: a.email ?? "",
              action: a.action,
              target: a.target ?? "",
              ip: a.ipAddress ?? "",
            }));
            const csv = rowsToCsv(rows, ["time", "tenant", "email", "action", "target", "ip"]);
                        downloadCsv(exportFilename("admin-activity", "csv"), csv);
          }}
          style={{ padding: "6px 12px", borderRadius: 100, fontSize: 12, border: "1px solid rgba(10,10,10,0.12)", background: "transparent", color: "#525252", cursor: "pointer", fontFamily: "inherit" }}
        >
          ↓ CSV
        </button>
      )}
      {actionFilter && (
        <button
          onClick={() => {
            setActionFilter("");
            load();
          }}
          style={{
            marginBottom: 16,
            padding: "6px 12px",
            borderRadius: 100,
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#0F172A",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          × Filtre temizle ({actionFilter})
        </button>
      )}
      </div>

      {/* Activity list */}
      {loading ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Yükleniyor...</div>
      ) : activities.length === 0 ? (
        <div style={{ color: "#737373", fontSize: 13 }}>Eşleşen aktivite yok.</div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={th}>Zaman</th>
                <th style={th}>Action</th>
                <th style={th}>Email</th>
                <th style={th}>Tenant</th>
                <th style={th}>IP</th>
                <th style={{ ...th, textAlign: "left" }}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={td}>{new Date(a.createdAt).toLocaleString("tr-TR")}</td>
                  <td style={td}><code style={{ fontSize: 10 }}>{a.action}</code></td>
                  <td style={td}>{a.email ?? <span style={{ color: "#94A3B8" }}>—</span>}</td>
                  <td style={td}>{a.tenant?.name ?? (a.tenantId ? <code style={{ fontSize: 10 }}>{a.tenantId.slice(0, 8)}</code> : "—")}</td>
                  <td style={td}>{a.ipAddress ?? "—"}</td>
                  <td style={{ ...td, textAlign: "left", fontSize: 10, color: "#475569", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.target ?? ""}
                    {a.metadata ? ` ${JSON.stringify(a.metadata)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  fontSize: 12,
  color: "#0F172A",
};
