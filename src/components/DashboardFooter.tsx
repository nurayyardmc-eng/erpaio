// Sprint E.2 — KVKK/GDPR compliance footer on the dashboard.
// Required by KVKK md. 10 (information notice availability) and is a
// standard expectation for B2B SaaS audits. Renders below <main> in
// dashboard/layout.tsx. Server component — no hooks, no client JS.

import { colors } from "@/lib/theme";

export default function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: `1px solid ${colors.border}`,
        padding: "16px 24px",
        background: colors.bg,
        fontSize: 11,
        color: colors.textMuted,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>© {year} ERPAIO</div>
      <nav
        aria-label="Legal links"
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <a href="/privacy" style={{ color: colors.textMuted, textDecoration: "none" }}>
          Gizlilik · Privacy
        </a>
        <a href="/terms" style={{ color: colors.textMuted, textDecoration: "none" }}>
          Şartlar · Terms
        </a>
        <a href="/sub-processors" style={{ color: colors.textMuted, textDecoration: "none" }}>
          Alt yükleniciler · Sub-processors
        </a>
        <a
          href="mailto:privacy@erpaio.com"
          style={{ color: colors.textMuted, textDecoration: "none" }}
        >
          KVKK başvuru · privacy@erpaio.com
        </a>
      </nav>
    </footer>
  );
}
