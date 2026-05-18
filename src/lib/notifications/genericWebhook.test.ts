import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { buildWebhookRequest } from "./genericWebhook";

const FIXED_TS = "2026-01-01T00:00:00.000Z";

describe("notifications/genericWebhook/buildWebhookRequest", () => {
  it("body is JSON {event, timestamp, data}", () => {
    const { body } = buildWebhookRequest(
      { event: "alert.created", data: { id: 42 } },
      FIXED_TS,
    );
    const parsed = JSON.parse(body);
    expect(parsed).toEqual({
      event: "alert.created",
      timestamp: FIXED_TS,
      data: { id: 42 },
    });
  });

  it("base headers include Content-Type, User-Agent, X-ERPAIO-Event", () => {
    const { headers } = buildWebhookRequest({ event: "test.event", data: {} }, FIXED_TS);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["User-Agent"]).toBe("ERPAIO-Webhook/1.0");
    expect(headers["X-ERPAIO-Event"]).toBe("test.event");
  });

  it("no secret → no X-ERPAIO-Signature header", () => {
    const { headers } = buildWebhookRequest({ event: "x", data: {} }, FIXED_TS);
    expect(headers["X-ERPAIO-Signature"]).toBeUndefined();
  });

  it("secret null → no signature (treated as absent)", () => {
    const { headers } = buildWebhookRequest(
      { event: "x", data: {}, secret: null },
      FIXED_TS,
    );
    expect(headers["X-ERPAIO-Signature"]).toBeUndefined();
  });

  it("secret present → HMAC SHA-256 signature with sha256= prefix", () => {
    const { body, headers } = buildWebhookRequest(
      { event: "x", data: { foo: "bar" }, secret: "topsecret" },
      FIXED_TS,
    );
    const expected =
      "sha256=" + createHmac("sha256", "topsecret").update(body).digest("hex");
    expect(headers["X-ERPAIO-Signature"]).toBe(expected);
  });

  it("signature is hex (64 chars) — exact length predictable", () => {
    const { headers } = buildWebhookRequest(
      { event: "x", data: {}, secret: "s" },
      FIXED_TS,
    );
    const hex = headers["X-ERPAIO-Signature"].replace("sha256=", "");
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different body → different signature (tamper detectable)", () => {
    const r1 = buildWebhookRequest(
      { event: "x", data: { v: 1 }, secret: "s" },
      FIXED_TS,
    );
    const r2 = buildWebhookRequest(
      { event: "x", data: { v: 2 }, secret: "s" },
      FIXED_TS,
    );
    expect(r1.headers["X-ERPAIO-Signature"]).not.toBe(r2.headers["X-ERPAIO-Signature"]);
  });

  it("different secret → different signature", () => {
    const r1 = buildWebhookRequest({ event: "x", data: {}, secret: "a" }, FIXED_TS);
    const r2 = buildWebhookRequest({ event: "x", data: {}, secret: "b" }, FIXED_TS);
    expect(r1.headers["X-ERPAIO-Signature"]).not.toBe(r2.headers["X-ERPAIO-Signature"]);
  });

  it("identical input → identical signature (deterministic)", () => {
    const r1 = buildWebhookRequest({ event: "x", data: { v: 1 }, secret: "s" }, FIXED_TS);
    const r2 = buildWebhookRequest({ event: "x", data: { v: 1 }, secret: "s" }, FIXED_TS);
    expect(r1.headers["X-ERPAIO-Signature"]).toBe(r2.headers["X-ERPAIO-Signature"]);
  });

  it("timestamp passed through verbatim (not regenerated)", () => {
    const { body } = buildWebhookRequest({ event: "x", data: {} }, "2030-12-31T23:59:59.999Z");
    expect(JSON.parse(body).timestamp).toBe("2030-12-31T23:59:59.999Z");
  });

  it("complex nested data round-trips through JSON.stringify", () => {
    const data = { user: { id: 1, tags: ["a", "b"] }, n: null };
    const { body } = buildWebhookRequest({ event: "x", data }, FIXED_TS);
    expect(JSON.parse(body).data).toEqual(data);
  });
});
