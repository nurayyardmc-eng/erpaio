import Link from "next/link";

export const metadata = {
  title: "API Referansı · ERPAIO",
};

const groups = [
  {
    title: "Authentication",
    items: [
      { method: "POST", path: "/api/auth/signup", desc: "Yeni hesap + tenant" },
      { method: "POST", path: "/api/auth/mobile-login", desc: "JWT token (Bearer)" },
      { method: "POST", path: "/api/auth/forgot-password", desc: "Sıfırlama linki" },
    ],
  },
  {
    title: "Chat & Queries",
    items: [
      { method: "POST", path: "/api/chat", desc: "Türkçe → SQL → execute" },
      { method: "POST", path: "/api/chat/run-sql", desc: "Manuel SQL execute" },
      { method: "POST", path: "/api/chat/stream", desc: "Streaming (SSE)" },
      { method: "PATCH", path: "/api/chat/feedback", desc: "👍/👎 feedback" },
      { method: "POST", path: "/api/chat/explain", desc: "Sonuç AI yorumu" },
      { method: "POST", path: "/api/chat/follow-ups", desc: "Takip soruları" },
      { method: "GET", path: "/api/chat/sessions", desc: "Sohbet listesi" },
    ],
  },
  {
    title: "Alerts & Anomaly",
    items: [
      { method: "GET", path: "/api/alerts", desc: "Aktif alertler" },
      { method: "POST", path: "/api/cron/anomaly-detection", desc: "Cron, CRON_SECRET" },
      { method: "GET", path: "/api/metrics/dashboard", desc: "Pre-computed metrikler" },
    ],
  },
  {
    title: "Scheduled & Watch",
    items: [
      { method: "GET POST DELETE", path: "/api/scheduled-reports", desc: "Email rapor planları" },
      { method: "GET POST DELETE", path: "/api/watchlists", desc: "Threshold-based izleme" },
      { method: "GET POST DELETE", path: "/api/custom-metrics", desc: "Müşteri özel anomaly metrikleri" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { method: "GET POST DELETE", path: "/api/integrations", desc: "Slack/Teams/webhook" },
    ],
  },
  {
    title: "Tenant & Team",
    items: [
      { method: "GET PATCH", path: "/api/tenant", desc: "Tenant ayarları" },
      { method: "GET PATCH DELETE", path: "/api/team", desc: "Kullanıcılar + invitations" },
      { method: "POST", path: "/api/team/invite", desc: "Email davet" },
      { method: "GET PATCH", path: "/api/tenant/branding", desc: "White-label (Enterprise)" },
    ],
  },
  {
    title: "Security",
    items: [
      { method: "POST PATCH DELETE", path: "/api/auth/mfa/setup", desc: "TOTP MFA" },
      { method: "GET POST DELETE", path: "/api/security/allowlist", desc: "IP CIDR allowlist" },
      { method: "GET", path: "/api/audit", desc: "Audit log (KVKK)" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { method: "GET", path: "/api/analytics/forecast", desc: "Lineer tahmin + 95% CI" },
      { method: "GET", path: "/api/analytics/suggested-alerts", desc: "Otomatik watchlist önerileri" },
      { method: "GET", path: "/api/erp-insights", desc: "FK inference + custom flag" },
    ],
  },
  {
    title: "Connections & Schema",
    items: [
      { method: "GET POST", path: "/api/connections", desc: "ERP bağlantıları" },
      { method: "GET", path: "/api/connections/[id]/test", desc: "Bağlantı test" },
      { method: "GET PUT DELETE", path: "/api/annotations", desc: "Şema açıklamaları" },
      { method: "POST DELETE", path: "/api/me/push-token", desc: "Expo push token" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "#10B981",
  POST: "#0A0A0A",
  PATCH: "#F59E0B",
  PUT: "#F59E0B",
  DELETE: "#EF4444",
};

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#0F172A", fontFamily: "inherit" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#0A0A0A", fontSize: 11, letterSpacing: 4, fontWeight: 700, textDecoration: "none" }}>ERPAIO</Link>
        <Link href="/docs" style={{ color: "#475569", fontSize: 12, textDecoration: "none" }}>← Dokümantasyon</Link>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "60px 32px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>API Referansı</h1>
        <p style={{ color: "#475569", fontSize: 14, marginBottom: 12 }}>
          OpenAPI 3.0 spec:{" "}
          <a href="/api/openapi" style={{ color: "#0A0A0A" }}>JSON</a>
          {" · "}
          <a href="/api/openapi?format=yaml" style={{ color: "#0A0A0A" }}>YAML</a>
          {" · "}
          <a href="/openapi.yaml" style={{ color: "#0A0A0A" }}>Direkt indir</a>
        </p>
        <p style={{ color: "#94A3B8", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
          Postman / Insomnia / Swagger UI&apos;ye import et: yukarıdaki JSON
          URL&apos;ini kullan. Spec public/openapi.yaml dosyasından üretilir.
        </p>
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>Authentication</div>
          <code style={{ color: "#475569", fontSize: 12 }}>Authorization: Bearer &lt;JWT&gt;</code>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10 }}>Token: <code style={{ color: "#0A0A0A" }}>POST /api/auth/mobile-login</code></div>
        </div>

        {groups.map((g) => (
          <section key={g.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, color: "#0A0A0A", marginBottom: 12 }}>{g.title}</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {g.items.map((it) => (
                <div key={it.path + it.method} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {it.method.split(" ").map((m) => (
                      <span key={m} style={{ color: METHOD_COLORS[m] ?? "#475569", fontSize: 9, fontWeight: 600, padding: "2px 6px", border: `1px solid ${METHOD_COLORS[m] ?? "#475569"}40`, borderRadius: 3 }}>{m}</span>
                    ))}
                  </div>
                  <code style={{ color: "#0F172A", flex: 1 }}>{it.path}</code>
                  <span style={{ color: "#475569", fontSize: 11 }}>{it.desc}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, marginTop: 32, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
          <strong style={{ color: "#0A0A0A" }}>Rate limits:</strong> Tenant başına <code>/api/chat</code> 30/dk, <code>/api/chat/feedback</code> 60/dk/user, login deneme 10/15dk/IP.
          <br /><strong style={{ color: "#0A0A0A" }}>Token budget:</strong> Plan bazlı aylık limit. Aşılırsa 402.
          <br /><strong style={{ color: "#0A0A0A" }}>Errors:</strong> Tüm endpointler <code>{"{ \"error\": \"...\" }"}</code> formatında JSON döner.
        </div>
      </main>
    </div>
  );
}
