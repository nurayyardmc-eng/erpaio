import { describe, it, expect } from "vitest";
import {
  calcTrialDaysLeft,
  buildTrialWarningEmail,
} from "./warningEmail";

const DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-05-19T12:00:00Z").getTime();

describe("trial/warningEmail/calcTrialDaysLeft", () => {
  it("trial ends exactly now → 0 days left", () => {
    expect(calcTrialDaysLeft(new Date(FIXED_NOW), FIXED_NOW)).toBe(0);
  });

  it("trial ends 7 days from now → 7 days", () => {
    expect(calcTrialDaysLeft(new Date(FIXED_NOW + 7 * DAY), FIXED_NOW)).toBe(7);
  });

  it("trial ends 2.9 days from now → 2 days (floor)", () => {
    expect(
      calcTrialDaysLeft(new Date(FIXED_NOW + 2.9 * DAY), FIXED_NOW),
    ).toBe(2);
  });

  it("trial ended yesterday → -1 (floor of negative)", () => {
    // -0.5 day → floor(-0.5) = -1, which is the desired branch
    expect(calcTrialDaysLeft(new Date(FIXED_NOW - 0.5 * DAY), FIXED_NOW)).toBe(-1);
  });

  it("trial ended exactly 1 day ago → -1", () => {
    expect(calcTrialDaysLeft(new Date(FIXED_NOW - 1 * DAY), FIXED_NOW)).toBe(-1);
  });

  it("trial ended 7 days ago → -7", () => {
    expect(calcTrialDaysLeft(new Date(FIXED_NOW - 7 * DAY), FIXED_NOW)).toBe(-7);
  });

  it("default `now` argument uses Date.now()", () => {
    // Don't assert exact value, just that it doesn't throw.
    const r = calcTrialDaysLeft(new Date(Date.now() + 5 * DAY));
    expect(typeof r).toBe("number");
  });
});

describe("trial/warningEmail/buildTrialWarningEmail", () => {
  const TENANT = "Acme Corp";
  const BASE = "https://erpaio.test";

  it("returns null for non-trigger days (1, 3, 5, -2, -10, 100)", () => {
    for (const d of [1, 3, 5, -2, -10, 100]) {
      expect(buildTrialWarningEmail(d, TENANT, BASE)).toBeNull();
    }
  });

  it("daysLeft=7 → 'yarısına geldiniz' + dashboard CTA", () => {
    const e = buildTrialWarningEmail(7, TENANT, BASE);
    expect(e).not.toBeNull();
    expect(e!.subject).toBe("ERPAIO — Pro denemenizin yarısına geldiniz");
    expect(e!.html).toContain(`${BASE}/dashboard`);
  });

  it("daysLeft=2 → 'Planı Seç' + pricing CTA", () => {
    const e = buildTrialWarningEmail(2, TENANT, BASE);
    expect(e!.subject).toContain("2 gün kaldı");
    expect(e!.html).toContain(`${BASE}/pricing`);
  });

  it("daysLeft=0 → 'son günü' + Pro CTA", () => {
    const e = buildTrialWarningEmail(0, TENANT, BASE);
    expect(e!.subject).toContain("son günü");
    expect(e!.html).toContain(`${BASE}/pricing`);
  });

  it("daysLeft=-1 → 'dün sona erdi' + Pro CTA", () => {
    const e = buildTrialWarningEmail(-1, TENANT, BASE);
    expect(e!.subject).toContain("dün sona erdi");
    expect(e!.html).toContain(`${BASE}/pricing`);
  });

  it("daysLeft=-7 → 'Bir hafta önce' message", () => {
    const e = buildTrialWarningEmail(-7, TENANT, BASE);
    expect(e!.subject).toContain("Bir hafta önce");
  });

  it("each email subject prefixed with 'ERPAIO — '", () => {
    for (const d of [7, 2, 0, -1, -7]) {
      const e = buildTrialWarningEmail(d, TENANT, BASE);
      expect(e!.subject.startsWith("ERPAIO — ")).toBe(true);
    }
  });

  it("tenant name interpolated into footer (every variant)", () => {
    const odd = "Tëst & Co <esc>";
    for (const d of [7, 2, 0, -1, -7]) {
      const e = buildTrialWarningEmail(d, odd, BASE);
      // Verbatim — known no-escape behavior (caller responsibility).
      expect(e!.html).toContain(odd);
    }
  });

  it("CTA targets only /dashboard for day=7, /pricing for the rest", () => {
    expect(buildTrialWarningEmail(7, TENANT, BASE)!.html).toContain("/dashboard");
    for (const d of [2, 0, -1, -7]) {
      expect(buildTrialWarningEmail(d, TENANT, BASE)!.html).toContain("/pricing");
    }
  });

  it("uses default baseUrl when omitted", () => {
    // Use a value that no test sets to avoid leaking state.
    const e = buildTrialWarningEmail(7, TENANT);
    // baseUrl default: env NEXTAUTH_URL or production fallback.
    // Both forms contain a CTA link with /dashboard.
    expect(e!.html).toMatch(/dashboard/);
  });
});
