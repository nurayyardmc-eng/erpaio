import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as crypto from "crypto";
import {
  buildIyzicoAuthHeader,
  verifyIyzicoWebhookSignature,
  mapIyzicoStatusToInternal,
  inferPlanFromIyzicoReference,
  classifyIyzicoEvent,
} from "./iyzico";

describe("billing/iyzico/buildIyzicoAuthHeader", () => {
  it("produces IYZWSv2 scheme header with apiKey + base64 signature", () => {
    const header = buildIyzicoAuthHeader({
      apiKey: "test-api",
      secretKey: "test-secret",
      randomKey: "rand-123",
      uri: "/v2/subscription/checkoutform/initialize",
      body: { plan: "pro" },
    });
    expect(header.startsWith("IYZWSv2 test-api:")).toBe(true);
    // Base64 sig is the part after the colon.
    const sig = header.split(":").slice(1).join(":");
    expect(sig.length).toBeGreaterThan(20);
    // Round-trip: same inputs → same sig.
    const header2 = buildIyzicoAuthHeader({
      apiKey: "test-api",
      secretKey: "test-secret",
      randomKey: "rand-123",
      uri: "/v2/subscription/checkoutform/initialize",
      body: { plan: "pro" },
    });
    expect(header).toBe(header2);
  });

  it("different secretKey → different signature", () => {
    const a = buildIyzicoAuthHeader({ apiKey: "k", secretKey: "s1", randomKey: "r", uri: "/u", body: {} });
    const b = buildIyzicoAuthHeader({ apiKey: "k", secretKey: "s2", randomKey: "r", uri: "/u", body: {} });
    expect(a).not.toBe(b);
  });

  it("different body → different signature", () => {
    const a = buildIyzicoAuthHeader({ apiKey: "k", secretKey: "s", randomKey: "r", uri: "/u", body: { a: 1 } });
    const b = buildIyzicoAuthHeader({ apiKey: "k", secretKey: "s", randomKey: "r", uri: "/u", body: { a: 2 } });
    expect(a).not.toBe(b);
  });

  it("HMAC-SHA256 base64 length is consistent (44 chars padded)", () => {
    const h = buildIyzicoAuthHeader({ apiKey: "k", secretKey: "s", randomKey: "r", uri: "/u", body: {} });
    const sig = h.split(":").slice(1).join(":");
    expect(sig.length).toBe(44);
  });
});

describe("billing/iyzico/verifyIyzicoWebhookSignature", () => {
  const secret = "wh-secret-xyz";
  const body = JSON.stringify({ event: "subscription.activation", ref: "sub_1" });
  const validSig = crypto.createHmac("sha256", secret).update(body).digest("base64");

  it("valid signature → true", () => {
    expect(verifyIyzicoWebhookSignature(body, validSig, secret)).toBe(true);
  });

  it("missing signature → false", () => {
    expect(verifyIyzicoWebhookSignature(body, null, secret)).toBe(false);
  });

  it("empty signature → false", () => {
    expect(verifyIyzicoWebhookSignature(body, "", secret)).toBe(false);
  });

  it("tampered body → false", () => {
    const tamperedBody = body + "tamper";
    expect(verifyIyzicoWebhookSignature(tamperedBody, validSig, secret)).toBe(false);
  });

  it("wrong secret → false", () => {
    expect(verifyIyzicoWebhookSignature(body, validSig, "wrong-secret")).toBe(false);
  });

  it("garbage signature → false (length mismatch handled)", () => {
    expect(verifyIyzicoWebhookSignature(body, "xxx", secret)).toBe(false);
  });

  it("signature different length than expected → false (timingSafeEqual guard)", () => {
    expect(verifyIyzicoWebhookSignature(body, "AAAA", secret)).toBe(false);
  });
});

describe("billing/iyzico/mapIyzicoStatusToInternal", () => {
  it("ACTIVE → active", () => {
    expect(mapIyzicoStatusToInternal("ACTIVE")).toBe("active");
  });
  it("PENDING → trialing", () => {
    expect(mapIyzicoStatusToInternal("PENDING")).toBe("trialing");
  });
  it("UNPAID → past_due", () => {
    expect(mapIyzicoStatusToInternal("UNPAID")).toBe("past_due");
  });
  it("CANCELED → canceled", () => {
    expect(mapIyzicoStatusToInternal("CANCELED")).toBe("canceled");
  });
  it("EXPIRED → expired", () => {
    expect(mapIyzicoStatusToInternal("EXPIRED")).toBe("expired");
  });
  it("UPGRADED → incomplete (no explicit map)", () => {
    expect(mapIyzicoStatusToInternal("UPGRADED")).toBe("incomplete");
  });
  it("unknown → incomplete (defensive)", () => {
    expect(mapIyzicoStatusToInternal("WEIRD_STATE")).toBe("incomplete");
  });
});

describe("billing/iyzico/inferPlanFromIyzicoReference", () => {
  const origPro = process.env.IYZICO_PRICE_PRO;
  const origEnt = process.env.IYZICO_PRICE_ENTERPRISE;

  beforeEach(() => {
    process.env.IYZICO_PRICE_PRO = "pricing-plan-pro-ref-123";
    process.env.IYZICO_PRICE_ENTERPRISE = "pricing-plan-ent-ref-456";
  });

  afterEach(() => {
    process.env.IYZICO_PRICE_PRO = origPro;
    process.env.IYZICO_PRICE_ENTERPRISE = origEnt;
  });

  it("matching enterprise ref → enterprise", () => {
    expect(inferPlanFromIyzicoReference("pricing-plan-ent-ref-456")).toBe("enterprise");
  });

  it("matching pro ref → pro", () => {
    expect(inferPlanFromIyzicoReference("pricing-plan-pro-ref-123")).toBe("pro");
  });

  it("undefined ref → pro (defensive default)", () => {
    expect(inferPlanFromIyzicoReference(undefined)).toBe("pro");
  });

  it("empty string ref → pro (falsy default)", () => {
    expect(inferPlanFromIyzicoReference("")).toBe("pro");
  });

  it("unknown ref → pro (defensive, never downgrade a paid customer)", () => {
    expect(inferPlanFromIyzicoReference("nope-not-our-ref")).toBe("pro");
  });

  it("env vars unset → still returns pro for known-looking ref", () => {
    delete process.env.IYZICO_PRICE_PRO;
    delete process.env.IYZICO_PRICE_ENTERPRISE;
    expect(inferPlanFromIyzicoReference("anything")).toBe("pro");
  });
});

describe("billing/iyzico/classifyIyzicoEvent", () => {
  it("subscription.activation → activation", () => {
    expect(classifyIyzicoEvent("subscription.activation")).toBe("activation");
  });
  it("subscription.renewal → renewal", () => {
    expect(classifyIyzicoEvent("subscription.renewal")).toBe("renewal");
  });
  it("subscription.unpaid → unpaid", () => {
    expect(classifyIyzicoEvent("subscription.unpaid")).toBe("unpaid");
  });
  it("subscription.cancellation → cancellation", () => {
    expect(classifyIyzicoEvent("subscription.cancellation")).toBe("cancellation");
  });
  it("subscription.trial.expire → trial.expire", () => {
    expect(classifyIyzicoEvent("subscription.trial.expire")).toBe("trial.expire");
  });
  it("subscription.expire → expire", () => {
    expect(classifyIyzicoEvent("subscription.expire")).toBe("expire");
  });
  it("unknown event type → unhandled (defensive)", () => {
    expect(classifyIyzicoEvent("subscription.weird")).toBe("unhandled");
  });
  it("undefined event type → unhandled", () => {
    expect(classifyIyzicoEvent(undefined)).toBe("unhandled");
  });
  it("empty string → unhandled", () => {
    expect(classifyIyzicoEvent("")).toBe("unhandled");
  });
  it("case-sensitive (uppercase variant) → unhandled", () => {
    expect(classifyIyzicoEvent("SUBSCRIPTION.ACTIVATION")).toBe("unhandled");
  });
});
