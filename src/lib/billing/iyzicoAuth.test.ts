import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import {
  buildIyzicoAuthHeader,
  verifyIyzicoWebhookSignature,
  mapIyzicoStatusToInternal,
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
