import { describe, it, expect } from "vitest";
import {
  retentionWindow,
  buildRetentionEmail,
  MIN_AGE_HOURS,
  MAX_AGE_HOURS,
} from "./abandonedWizard";

describe("lib/retention/abandonedWizard/retentionWindow", () => {
  it("spans MAX..MIN hours before now", () => {
    const now = new Date("2026-05-31T12:00:00.000Z");
    const w = retentionWindow(now);
    expect(w.notBefore.toISOString()).toBe("2026-05-28T12:00:00.000Z"); // 72h
    expect(w.notAfter.toISOString()).toBe("2026-05-30T12:00:00.000Z"); // 24h
  });
  it("notBefore is earlier than notAfter", () => {
    const w = retentionWindow(new Date());
    expect(w.notBefore.getTime()).toBeLessThan(w.notAfter.getTime());
  });
  it("uses the documented constants", () => {
    expect(MIN_AGE_HOURS).toBe(24);
    expect(MAX_AGE_HOURS).toBe(72);
  });
});

describe("lib/retention/abandonedWizard/buildRetentionEmail", () => {
  it("TR (default) subject + CTA + connections link", () => {
    const e = buildRetentionEmail();
    expect(e.subject).toContain("ERPAIO kurulumunuzu");
    expect(e.html).toContain("/dashboard/connections");
    expect(e.html).toContain("Bağlantıyı Tamamla");
    expect(e.text).toContain("/dashboard/connections");
  });

  it("EN variant", () => {
    const e = buildRetentionEmail("en");
    expect(e.subject).toBe("Let's finish setting up ERPAIO together");
    expect(e.html).toContain("Finish connecting");
  });

  it("unknown locale falls back to TR", () => {
    const e = buildRetentionEmail("de" as never);
    expect(e.subject).toContain("ERPAIO kurulumunuzu");
  });

  it("html is a full document with the CTA url", () => {
    const e = buildRetentionEmail("en");
    expect(e.html.startsWith("<!doctype html>")).toBe(true);
    expect(e.html).toContain("https://erpaio.vercel.app/dashboard/connections");
  });
});
