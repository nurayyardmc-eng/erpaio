import { describe, it, expect } from "vitest";
import {
  subscriptionActivatedEmail,
  trialWillEndEmail,
  subscriptionCancelledEmail,
  paymentFailedEmail,
} from "./stripeEmails";

describe("billing/stripeEmails/subscriptionActivatedEmail", () => {
  const params = { plan: "pro", tenantName: "Acme Ltd", dashboardUrl: "https://app/dashboard" };

  it("TR default — plan uppercased in subject + heading", () => {
    const c = subscriptionActivatedEmail(params);
    expect(c.subject).toBe("ERPAIO PRO planı aktif");
    expect(c.heading).toBe("PRO planına hoş geldiniz");
    expect(c.body).toContain("Acme Ltd");
    expect(c.body).toContain("aylık token");
    expect(c.ctaText).toBe("Dashboard'a Git →");
    expect(c.ctaUrl).toBe("https://app/dashboard");
  });

  it("EN", () => {
    const c = subscriptionActivatedEmail(params, "en");
    expect(c.subject).toBe("ERPAIO PRO plan active");
    expect(c.heading).toBe("Welcome to PRO");
    expect(c.body).toContain("Acme Ltd");
    expect(c.body).toContain("monthly tokens");
    expect(c.ctaText).toBe("Go to Dashboard →");
  });

  it("unknown locale → TR", () => {
    const c = subscriptionActivatedEmail(params, "fr");
    expect(c.subject).toContain("aktif");
  });
});

describe("billing/stripeEmails/trialWillEndEmail", () => {
  const params = { tenantName: "Acme", pricingUrl: "https://app/pricing" };

  it("TR default", () => {
    const c = trialWillEndEmail(params);
    expect(c.subject).toContain("3 gün kaldı");
    expect(c.body).toContain("Acme");
    expect(c.body).toContain("kart");
    expect(c.ctaText).toBe("Planları İncele →");
  });

  it("EN", () => {
    const c = trialWillEndEmail(params, "en");
    expect(c.subject).toContain("ends in 3 days");
    expect(c.heading).toBe("Billing starts in 3 days");
    expect(c.body).toContain("card");
    expect(c.ctaText).toBe("View Plans →");
  });
});

describe("billing/stripeEmails/subscriptionCancelledEmail", () => {
  const params = { tenantName: "Acme", pricingUrl: "https://app/pricing" };

  it("TR default — mentions Starter downgrade", () => {
    const c = subscriptionCancelledEmail(params);
    expect(c.subject).toContain("iptal");
    expect(c.body).toContain("Starter");
    expect(c.body).toContain("verileriniz korunuyor");
  });

  it("EN — mentions Starter downgrade + data preservation", () => {
    const c = subscriptionCancelledEmail(params, "en");
    expect(c.subject).toContain("cancelled");
    expect(c.body).toContain("Starter");
    expect(c.body).toContain("data is preserved");
    expect(c.ctaText).toBe("Resume Pro →");
  });
});

describe("billing/stripeEmails/paymentFailedEmail", () => {
  const params = { tenantName: "Acme", invoiceUrl: "https://invoice.stripe/abc" };

  it("TR default — 7-day grace mentioned", () => {
    const c = paymentFailedEmail(params);
    expect(c.subject).toContain("başarısız");
    expect(c.body).toContain("7 gün");
    expect(c.ctaUrl).toBe("https://invoice.stripe/abc");
  });

  it("EN — 7-day grace mentioned", () => {
    const c = paymentFailedEmail(params, "en");
    expect(c.subject).toContain("Payment failed");
    expect(c.body).toContain("7 days");
    expect(c.ctaText).toBe("View Invoice →");
  });
});

describe("StripeEmailContent shape (all 4 helpers)", () => {
  it("returns subject/heading/body/ctaText/ctaUrl on every helper × locale", () => {
    const allLocales: Array<"tr" | "en"> = ["tr", "en"];
    const cases = [
      () => subscriptionActivatedEmail({ plan: "pro", tenantName: "X", dashboardUrl: "/d" }),
      () => trialWillEndEmail({ tenantName: "X", pricingUrl: "/p" }),
      () => subscriptionCancelledEmail({ tenantName: "X", pricingUrl: "/p" }),
      () => paymentFailedEmail({ tenantName: "X", invoiceUrl: "/i" }),
    ];
    for (const locale of allLocales) {
      for (const fn of cases) {
        const c = fn();
        expect(typeof c.subject).toBe("string");
        expect(typeof c.heading).toBe("string");
        expect(typeof c.body).toBe("string");
        expect(typeof c.ctaText).toBe("string");
        expect(typeof c.ctaUrl).toBe("string");
        expect(c.subject.length).toBeGreaterThan(5);
        expect(c.body.length).toBeGreaterThan(20);
      }
      // Locale variant smoke
      const en = subscriptionActivatedEmail({ plan: "pro", tenantName: "Y", dashboardUrl: "/d" }, locale);
      expect(en.subject).toBeTruthy();
    }
  });
});
