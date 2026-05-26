// Mixed-endpoint smoke load test — sanity check that the platform serves
// real traffic across multiple route types without 500s.
//
// Usage:
//   K6_BASE_URL=https://erpaio.vercel.app k6 run scenarios/smoke.js

import http from "k6/http";
import { check, group } from "k6";

export const options = {
  stages: [
    { duration: "15s", target: 10 },
    { duration: "1m",  target: 30 },   // sustained light load
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<3000", "p(99)<6000"],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || "https://erpaio.vercel.app";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/docs",
  "/login",
  "/signup",
  "/status",
];

const API_HEALTH = "/api/health";
const API_OPENAPI = "/api/openapi";

export default function () {
  group("public pages", () => {
    const path = PUBLIC_PATHS[Math.floor(Math.random() * PUBLIC_PATHS.length)];
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`${path} responds 2xx/3xx`]: (r) => r.status >= 200 && r.status < 400,
    });
  });

  group("api: health", () => {
    const res = http.get(`${BASE_URL}${API_HEALTH}`);
    check(res, {
      "/api/health 200": (r) => r.status === 200,
    });
  });

  group("api: openapi", () => {
    const res = http.get(`${BASE_URL}${API_OPENAPI}`);
    check(res, {
      "/api/openapi 200": (r) => r.status === 200,
    });
  });

  group("auth boundary: 401 on protected", () => {
    const res = http.get(`${BASE_URL}/api/me`);
    check(res, {
      "/api/me unauth → 401": (r) => r.status === 401,
    });
  });
}
