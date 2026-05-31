// Sprint F.3 — read-only feature flag inspector for sysadmins.
//
// Surfaces the currently-resolved value of every flag along with its
// source ("env" if FEATURE_FLAG_<NAME> is set, "default" otherwise).
// Toggling is intentionally NOT here — flags change via Vercel env
// var update (then redeploy / restart). That keeps "production state"
// observable in a single place (Vercel UI) instead of split between
// DB and code, and avoids accidental mid-request flag flips.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { snapshotFlags } from "@/lib/featureFlags";
import { requireSysAdmin } from "@/lib/auth/sysadmin";

export default async function FeatureFlagsPage() {
  // requireSysAdmin operates on a Request; reconstruct minimal Request
  // from headers (server-component context). On failure redirect to /login.
  const hdrs = await headers();
  const req = new Request("http://x/", { headers: Object.fromEntries(hdrs.entries()) });
  const guard = await requireSysAdmin(req);
  if ("error" in guard) redirect("/login");
  const flags = snapshotFlags();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        color: "#0F172A",
        fontFamily: "inherit",
        padding: 40,
      }}
    >
      <div style={{ color: "#F59E0B", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ERPAIO · ADMIN
      </div>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Feature Flags</h1>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 24 }}>
        Read-only — flag değişiklikleri Vercel env üzerinden yapılır.
        Variable adı: <code>FEATURE_FLAG_&lt;UPPER_SNAKE&gt;</code>. Değer:{" "}
        <code>1/0</code>, <code>true/false</code>, <code>on/off</code>.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Key", "Enabled", "Source", "Description"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  color: "#0A0A0A",
                  borderBottom: "1px solid #E5E7EB",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr key={f.key} style={{ borderBottom: "1px solid #FFFFFF" }}>
              <td
                style={{
                  padding: "8px 10px",
                  fontFamily: "ui-monospace, Menlo, monospace",
                  color: "#0F172A",
                }}
              >
                {f.key}
              </td>
              <td style={{ padding: "8px 10px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: f.enabled ? "#D1FAE5" : "#FEE2E2",
                    color: f.enabled ? "#065F46" : "#991B1B",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {f.enabled ? "ON" : "OFF"}
                </span>
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  color: f.source === "env" ? "#7C3AED" : "#94A3B8",
                  fontSize: 11,
                }}
              >
                {f.source}
              </td>
              <td style={{ padding: "8px 10px", color: "#475569", fontSize: 11 }}>
                {f.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
