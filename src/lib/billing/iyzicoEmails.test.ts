import { describe, it, expect } from "vitest";
import {
  iyzicoSubscriptionActivatedEmail,
  iyzicoSubscriptionRenewalEmail,
  iyzicoSubscriptionUnpaidEmail,
  iyzicoSubscriptionCancelledEmail,
  iyzicoTrialExpiringEmail,
} from "./iyzicoEmails";

describe("billing/iyzicoEmails/subscriptionActivated", () => {
  const p = { plan: "pro", tenantName: "Acme", dashboardUrl: "https://app/d" };
  it("TR mentions iyzico + plan name", () => {
    const c = iyzicoSubscriptionActivatedEmail(p);
    expect(c.subject).toBe("ERPAIO PRO planı aktif");
    expect(c.body).toContain("iyzico");
    expect(c.body).toContain("Acme");
  });
  it("EN mentions iyzico + invoice", () => {
    const c = iyzicoSubscriptionActivatedEmail(p, "en");
    expect(c.subject).toBe("ERPAIO PRO plan active");
    expect(c.body).toContain("iyzico");
    expect(c.body).toContain("invoice");
  });
});

describe("billing/iyzicoEmails/subscriptionRenewal", () => {
  const p = { plan: "pro", tenantName: "Acme", dashboardUrl: "https://app/d" };
  it("TR — fatura mention", () => {
    const c = iyzicoSubscriptionRenewalEmail(p);
    expect(c.subject).toContain("yenilendi");
    expect(c.body).toContain("fatura");
  });
  it("EN — invoice mention", () => {
    const c = iyzicoSubscriptionRenewalEmail(p, "en");
    expect(c.subject).toContain("renewed");
    expect(c.body).toContain("Turkish-format invoice");
  });
});

describe("billing/iyzicoEmails/subscriptionUnpaid", () => {
  const p = { tenantName: "Acme", settingsUrl: "https://app/s" };
  it("TR — 7 day grace", () => {
    const c = iyzicoSubscriptionUnpaidEmail(p);
    expect(c.subject).toContain("alınamadı");
    expect(c.body).toContain("7 gün");
  });
  it("EN — 7 day grace", () => {
    const c = iyzicoSubscriptionUnpaidEmail(p, "en");
    expect(c.subject).toContain("payment failed");
    expect(c.body).toContain("7 days");
  });
});

describe("billing/iyzicoEmails/subscriptionCancelled", () => {
  const p = { tenantName: "Acme", pricingUrl: "https://app/p" };
  it("TR — Starter downgrade", () => {
    const c = iyzicoSubscriptionCancelledEmail(p);
    expect(c.body).toContain("Starter");
    expect(c.body).toContain("verileriniz korunuyor");
  });
  it("EN — Starter downgrade + data preserved", () => {
    const c = iyzicoSubscriptionCancelledEmail(p, "en");
    expect(c.body).toContain("Starter");
    expect(c.body).toContain("data is preserved");
  });
});

describe("billing/iyzicoEmails/trialExpiring", () => {
  const p = { tenantName: "Acme", pricingUrl: "https://app/p" };
  it("TR — 3 gün", () => {
    const c = iyzicoTrialExpiringEmail(p);
    expect(c.subject).toContain("3 gün kaldı");
    expect(c.body).toContain("iyzico");
  });
  it("EN — 3 days", () => {
    const c = iyzicoTrialExpiringEmail(p, "en");
    expect(c.subject).toContain("3 days");
    expect(c.body).toContain("iyzico");
  });
});

describe("billing/iyzicoEmails — content shape invariants", () => {
  it("every helper × locale returns subject/heading/body/ctaText/ctaUrl", () => {
    const cases = [
      iyzicoSubscriptionActivatedEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }),
      iyzicoSubscriptionActivatedEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }, "en"),
      iyzicoSubscriptionRenewalEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }),
      iyzicoSubscriptionRenewalEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }, "en"),
      iyzicoSubscriptionUnpaidEmail({ tenantName: "X", settingsUrl: "/s" }),
      iyzicoSubscriptionUnpaidEmail({ tenantName: "X", settingsUrl: "/s" }, "en"),
      iyzicoSubscriptionCancelledEmail({ tenantName: "X", pricingUrl: "/p" }),
      iyzicoSubscriptionCancelledEmail({ tenantName: "X", pricingUrl: "/p" }, "en"),
      iyzicoTrialExpiringEmail({ tenantName: "X", pricingUrl: "/p" }),
      iyzicoTrialExpiringEmail({ tenantName: "X", pricingUrl: "/p" }, "en"),
    ];
    for (const c of cases) {
      expect(typeof c.subject).toBe("string");
      expect(typeof c.heading).toBe("string");
      expect(typeof c.body).toBe("string");
      expect(typeof c.ctaText).toBe("string");
      expect(typeof c.ctaUrl).toBe("string");
      expect(c.subject.length).toBeGreaterThan(5);
      expect(c.body.length).toBeGreaterThan(20);
    }
  });

  it("unknown locale → TR fallback", () => {
    const c = iyzicoSubscriptionActivatedEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }, "fr");
    expect(c.subject).toContain("aktif");
  });
});
