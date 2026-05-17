import { describe, it, expect } from "vitest";
import { consentContextFromRequest } from "./consent";

function mkReq(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("consentContextFromRequest", () => {
  it("extracts x-forwarded-for first IP (proxy chain)", () => {
    const ctx = consentContextFromRequest(
      mkReq({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 192.168.1.1" }),
    );
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("trims whitespace from extracted IP", () => {
    const ctx = consentContextFromRequest(mkReq({ "x-forwarded-for": "  203.0.113.5  " }));
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' when no x-forwarded-for", () => {
    const ctx = consentContextFromRequest(mkReq());
    expect(ctx.ipAddress).toBe("unknown");
  });

  it("captures user-agent header verbatim", () => {
    const ctx = consentContextFromRequest(
      mkReq({ "user-agent": "Mozilla/5.0 (KVKK audit; en-US)" }),
    );
    expect(ctx.userAgent).toBe("Mozilla/5.0 (KVKK audit; en-US)");
  });

  it("falls back to 'unknown' for missing user-agent", () => {
    const ctx = consentContextFromRequest(mkReq({ "x-forwarded-for": "1.2.3.4" }));
    expect(ctx.userAgent).toBe("unknown");
  });

  it("returns both fields even when neither header present", () => {
    const ctx = consentContextFromRequest(mkReq());
    expect(ctx).toEqual({ ipAddress: "unknown", userAgent: "unknown" });
  });
});
