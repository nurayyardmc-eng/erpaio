import { describe, it, expect } from "vitest";
import {
  isPathPublic,
  isMaintenanceBypassed,
  isApiPath,
  pickLandingFile,
  isSupportedLandingLang,
  PUBLIC_PATHS,
  MAINTENANCE_BYPASS,
  SUPPORTED_LANDING_LANGS,
} from "./proxy-helpers";

describe("proxy-helpers/isPathPublic", () => {
  it("root is public", () => {
    expect(isPathPublic("/")).toBe(true);
  });

  it("each exact public path is public", () => {
    for (const p of PUBLIC_PATHS) {
      expect(isPathPublic(p)).toBe(true);
    }
  });

  it("child paths of public roots are public (e.g. /docs/api)", () => {
    expect(isPathPublic("/docs/api")).toBe(true);
    expect(isPathPublic("/pricing/enterprise")).toBe(true);
    expect(isPathPublic("/reset-password/abc-token")).toBe(true);
  });

  it("dashboard paths are NOT public", () => {
    expect(isPathPublic("/dashboard")).toBe(false);
    expect(isPathPublic("/dashboard/chat")).toBe(false);
    expect(isPathPublic("/dashboard/settings")).toBe(false);
  });

  it("path that looks like prefix but isn't a child → false", () => {
    // "/loginfoo" is NOT a child of "/login" — must be /login/ or exact.
    expect(isPathPublic("/loginfoo")).toBe(false);
    expect(isPathPublic("/docs-extra")).toBe(false);
  });

  it("api paths are NOT public (handled separately by isApiPath)", () => {
    expect(isPathPublic("/api/me")).toBe(false);
  });
});

describe("proxy-helpers/isMaintenanceBypassed", () => {
  it("each exact bypass path returns true", () => {
    for (const p of MAINTENANCE_BYPASS) {
      expect(isMaintenanceBypassed(p)).toBe(true);
    }
  });

  it("child paths of bypass roots → true (e.g. /api/cron/anomaly)", () => {
    expect(isMaintenanceBypassed("/api/cron/anomaly-detection")).toBe(true);
    expect(isMaintenanceBypassed("/api/cron/cleanup")).toBe(true);
    expect(isMaintenanceBypassed("/api/health")).toBe(true);
  });

  it("regular dashboard/auth paths are NOT bypassed", () => {
    expect(isMaintenanceBypassed("/dashboard")).toBe(false);
    expect(isMaintenanceBypassed("/login")).toBe(false);
    expect(isMaintenanceBypassed("/api/me")).toBe(false);
  });

  it("prefix-not-child trap (/api/cronfoo) → false", () => {
    expect(isMaintenanceBypassed("/api/cronfoo")).toBe(false);
  });
});

describe("proxy-helpers/isApiPath", () => {
  it("paths starting with /api → true", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/me")).toBe(true);
    expect(isApiPath("/api/v1/x")).toBe(true);
  });

  it("non-api paths → false", () => {
    expect(isApiPath("/dashboard")).toBe(false);
    expect(isApiPath("/")).toBe(false);
    expect(isApiPath("/login")).toBe(false);
  });

  it("path that starts with 'api' but no leading slash → false", () => {
    expect(isApiPath("api/me")).toBe(false);
  });
});

describe("proxy-helpers/pickLandingFile", () => {
  it("tr → /landing-tr.html", () => {
    expect(pickLandingFile("tr")).toBe("/landing-tr.html");
  });

  it("ar → /landing-ar.html (RTL)", () => {
    expect(pickLandingFile("ar")).toBe("/landing-ar.html");
  });

  it("en → /landing.html (default English)", () => {
    expect(pickLandingFile("en")).toBe("/landing.html");
  });

  it("unknown lang → /landing.html (default English)", () => {
    expect(pickLandingFile("de")).toBe("/landing.html");
    expect(pickLandingFile("xx")).toBe("/landing.html");
  });

  it("undefined / null → /landing.html (default)", () => {
    expect(pickLandingFile(undefined)).toBe("/landing.html");
    expect(pickLandingFile(null)).toBe("/landing.html");
  });

  it("empty string → default", () => {
    expect(pickLandingFile("")).toBe("/landing.html");
  });
});

describe("proxy-helpers/isSupportedLandingLang", () => {
  it("supports tr/en/ar exactly (Whitelist)", () => {
    for (const lang of SUPPORTED_LANDING_LANGS) {
      expect(isSupportedLandingLang(lang)).toBe(true);
    }
  });

  it("rejects unsupported langs", () => {
    expect(isSupportedLandingLang("de")).toBe(false);
    expect(isSupportedLandingLang("fr")).toBe(false);
    expect(isSupportedLandingLang("TR")).toBe(false); // case sensitive
  });

  it("rejects undefined / null / empty", () => {
    expect(isSupportedLandingLang(undefined)).toBe(false);
    expect(isSupportedLandingLang(null)).toBe(false);
    expect(isSupportedLandingLang("")).toBe(false);
  });
});

describe("proxy-helpers data integrity", () => {
  it("PUBLIC_PATHS list has no duplicates", () => {
    expect(new Set(PUBLIC_PATHS).size).toBe(PUBLIC_PATHS.length);
  });

  it("MAINTENANCE_BYPASS list has no duplicates", () => {
    expect(new Set(MAINTENANCE_BYPASS).size).toBe(MAINTENANCE_BYPASS.length);
  });

  it("every PUBLIC_PATH starts with /", () => {
    for (const p of PUBLIC_PATHS) {
      expect(p.startsWith("/")).toBe(true);
    }
  });

  it("every MAINTENANCE_BYPASS starts with /", () => {
    for (const p of MAINTENANCE_BYPASS) {
      expect(p.startsWith("/")).toBe(true);
    }
  });
});
