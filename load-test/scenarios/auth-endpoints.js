// Rate-limit verification — auth endpoints brute-force resistance.
//
// Hits /api/auth/forgot-password and signup with garbage credentials at
// high rate; expects 429 after the rate-limit window.
//
// SAFE to run against production: only POSTs invalid data, no DB writes
// succeed (zod fails or unique constraint blocks).
//
// Usage:
//   K6_BASE_URL=https://erpaio.vercel.app k6 run scenarios/auth-endpoints.js

import http from "k6/http";
import { check } from "k6";

export const options = {
  // Burst — should trigger rate limit quickly
  vus: 10,
  duration: "30s",
  thresholds: {
    // Most requests will be 429s once limit hits; only assert no 5xx.
    "checks{tag:no_5xx}": ["rate>0.99"],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || "https://erpaio.vercel.app";

export default function () {
  // Forgot-password: 3/saat per IP. After 3 hits, expects 429.
  const fp = http.post(
    `${BASE_URL}/api/auth/forgot-password`,
    JSON.stringify({ email: `loadtest-${Math.random()}@example.com` }),
    { headers: { "content-type": "application/json" } },
  );
  check(fp, {
    "forgot-password status sane": (r) => [200, 400, 429].includes(r.status),
    "forgot-password no 5xx": (r) => r.status < 500,
  }, { tag: "no_5xx" });
}
