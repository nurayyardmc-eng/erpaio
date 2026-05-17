import { describe, it, expect } from "vitest";
import { activityContextFromRequest } from "./activity";

function mkReq(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("activityContextFromRequest", () => {
  it("extracts x-forwarded-for first IP", () => {
    const ctx = activityContextFromRequest(
      mkReq({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }),
    );
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("trims whitespace from IP", () => {
    const ctx = activityContextFromRequest(mkReq({ "x-forwarded-for": "  203.0.113.5  " }));
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' when no x-forwarded-for", () => {
    const ctx = activityContextFromRequest(mkReq());
    expect(ctx.ipAddress).toBe("unknown");
  });

  it("captures user-agent header", () => {
    const ctx = activityContextFromRequest(
      mkReq({ "user-agent": "Mozilla/5.0 ERPAIO/1.0" }),
    );
    expect(ctx.userAgent).toBe("Mozilla/5.0 ERPAIO/1.0");
  });

  it("falls back to 'unknown' when no user-agent", () => {
    const ctx = activityContextFromRequest(mkReq());
    expect(ctx.userAgent).toBe("unknown");
  });
});
