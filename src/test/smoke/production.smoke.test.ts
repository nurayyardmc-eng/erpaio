/**
 * Production smoke tests — run against live deployment to catch real
 * regressions (deploy broken, DB unreachable, public pages 500'ing).
 *
 * Track IIIIIII — runs in vitest but only when SMOKE_BASE_URL is set.
 * Default skip → CI build doesn't break for normal commits.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://erpaio.vercel.app npm test smoke
 *
 * Recommended GitHub Actions workflow: post-deploy job in ci.yml that
 * runs `SMOKE_BASE_URL=$VERCEL_URL npm test smoke` after Vercel deploys.
 *
 * These tests MUST be non-mutating — only GET / public endpoints.
 */

import { describe, it, expect } from "vitest";

const BASE = process.env.SMOKE_BASE_URL;
const skipMsg = "SMOKE_BASE_URL not set — skipping production smoke tests";

const runIfBase = BASE ? describe : describe.skip;

// Production cold starts can exceed default 5s timeout, especially for
// sitemap.xml + dynamic pages. 15s gives Vercel cold start headroom.
const SMOKE_TIMEOUT = 15_000;

runIfBase(`production smoke (${BASE})`, () => {
  describe("health endpoint", () => {
    it("/api/health returns ok=true + version", async () => {
      const res = await fetch(`${BASE}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json() as { ok: boolean; version: string; env: string; checks: { database: { ok: boolean } } };
      expect(body.ok).toBe(true);
      expect(typeof body.version).toBe("string");
      expect(body.version.length).toBeGreaterThan(0);
      expect(body.checks.database.ok).toBe(true);
    });

    it("/api/health?deep=true includes cron jobs summary", async () => {
      const res = await fetch(`${BASE}/api/health?deep=true`);
      expect(res.status).toBe(200);
      const body = await res.json() as { checks: { cron?: { ok: boolean; jobs: Record<string, unknown> } } };
      // cron field optional (might not be present if no runs in 24h)
      if (body.checks.cron) {
        expect(typeof body.checks.cron.ok).toBe("boolean");
      }
    });
  });

  describe("public pages render (no 5xx)", () => {
    const publicPaths = [
      "/",
      "/login",
      "/signup",
      "/pricing",
      "/privacy",
      "/terms",
      "/docs",
      "/help",
      "/status",
      "/about",
      "/changelog",
    ];

    for (const path of publicPaths) {
      it(`${path} returns 2xx or 3xx`, { timeout: SMOKE_TIMEOUT }, async () => {
        const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(400);
      });
    }
  });

  describe("API auth boundaries (must be 401 for protected endpoints)", () => {
    const protectedPaths = [
      "/api/me",
      "/api/tenant",
      "/api/connections",
      "/api/chat/sessions",
      "/api/alerts",
      "/api/saved-queries",
    ];

    for (const path of protectedPaths) {
      it(`${path} unauth → 401`, { timeout: SMOKE_TIMEOUT }, async () => {
        const res = await fetch(`${BASE}${path}`);
        expect(res.status).toBe(401);
      });
    }
  });

  describe("security headers (regression markers)", () => {
    it("HSTS + X-Frame-Options + X-Content-Type-Options set on root", async () => {
      const res = await fetch(`${BASE}/`);
      expect(res.headers.get("strict-transport-security")).toContain("max-age=");
      expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("CSP header includes self origin", async () => {
      const res = await fetch(`${BASE}/`);
      const csp = res.headers.get("content-security-policy");
      expect(csp).not.toBeNull();
      expect(csp).toContain("'self'");
    });
  });

  describe("OpenAPI public spec", () => {
    it("/api/openapi returns JSON with paths", { timeout: SMOKE_TIMEOUT }, async () => {
      const res = await fetch(`${BASE}/api/openapi`);
      expect(res.status).toBe(200);
      const spec = await res.json() as { paths?: Record<string, unknown> };
      expect(spec.paths).toBeTruthy();
      expect(Object.keys(spec.paths ?? {}).length).toBeGreaterThan(0);
    });

    it("/api/openapi?format=yaml returns text/yaml", { timeout: SMOKE_TIMEOUT }, async () => {
      const res = await fetch(`${BASE}/api/openapi?format=yaml`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("yaml");
    });
  });

  describe("static assets reachable", () => {
    it("logo.svg returns 200 + image content-type", { timeout: SMOKE_TIMEOUT }, async () => {
      const res = await fetch(`${BASE}/logo.svg`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("svg");
    });

    it("robots.txt returns 200", { timeout: SMOKE_TIMEOUT }, async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      expect(res.status).toBe(200);
    });

    it("sitemap.xml returns 200", { timeout: SMOKE_TIMEOUT }, async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      expect(res.status).toBe(200);
    });
  });
});

describe("smoke test infrastructure (always-on)", () => {
  it("SMOKE_BASE_URL handling", () => {
    if (!BASE) {
      console.warn(skipMsg);
    }
    expect(typeof BASE === "string" || BASE === undefined).toBe(true);
  });
});
