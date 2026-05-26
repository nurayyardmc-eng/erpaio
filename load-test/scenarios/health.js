// ERPAIO health endpoint load test.
//
// Usage:
//   K6_BASE_URL=https://erpaio.vercel.app k6 run scenarios/health.js
//
// Measures:
//   - Cold start: first request after deploy
//   - Warm latency: sustained 30s ramp
//   - DB connection: every /api/health hits prisma.$queryRaw SELECT 1
//
// Thresholds:
//   - 99% requests succeed (DB never down >1%)
//   - p(95) under 2s (Supabase EU pooler + Vercel edge cold start)
//   - p(99) under 5s (cold start spike tolerance)

import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 5 },    // ramp up
    { duration: "30s", target: 20 },   // sustain
    { duration: "5s", target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],         // <1% errors
    http_req_duration: [
      "p(95)<2000",
      "p(99)<5000",
    ],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || "https://erpaio.vercel.app";

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has ok=true": (r) => r.json("ok") === true,
    "db check passes": (r) => r.json("checks.database.ok") === true,
  });
}
