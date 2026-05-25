import { describe, it, expect } from "vitest";
import { extractClientIp } from "./clientIp";

function mkReq(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("http/clientIp/extractClientIp", () => {
  describe("X-Forwarded-For (canonical CDN path)", () => {
    it("single IP → returned", () => {
      expect(extractClientIp(mkReq({ "x-forwarded-for": "203.0.113.5" }))).toBe(
        "203.0.113.5",
      );
    });

    it("multiple IPs (CDN chain) → first one (client)", () => {
      expect(
        extractClientIp(
          mkReq({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 172.16.0.2" }),
        ),
      ).toBe("203.0.113.5");
    });

    it("leading/trailing whitespace trimmed", () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "  203.0.113.5  " })),
      ).toBe("203.0.113.5");
    });

    it("whitespace within comma list trimmed on first slice", () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "  203.0.113.5  ,  10.0.0.1" })),
      ).toBe("203.0.113.5");
    });

    it("IPv6 preserved verbatim", () => {
      expect(
        extractClientIp(
          mkReq({ "x-forwarded-for": "2001:db8::1, 2001:db8::2" }),
        ),
      ).toBe("2001:db8::1");
    });
  });

  describe("X-Real-IP fallback (when XFF absent)", () => {
    it("XRI returned when XFF missing", () => {
      expect(extractClientIp(mkReq({ "x-real-ip": "198.51.100.1" }))).toBe(
        "198.51.100.1",
      );
    });

    it("XRI trimmed", () => {
      expect(extractClientIp(mkReq({ "x-real-ip": "  198.51.100.1  " }))).toBe(
        "198.51.100.1",
      );
    });

    it("XFF empty + XRI present → XRI", () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "", "x-real-ip": "198.51.100.1" })),
      ).toBe("198.51.100.1");
    });

    it("XFF whitespace-only + XRI present → XRI fallback", () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.1" })),
      ).toBe("198.51.100.1");
    });

    it("XFF takes precedence over XRI when both present", () => {
      expect(
        extractClientIp(
          mkReq({ "x-forwarded-for": "203.0.113.5", "x-real-ip": "198.51.100.1" }),
        ),
      ).toBe("203.0.113.5");
    });
  });

  describe("fallback when no IP headers", () => {
    it('no headers → "unknown"', () => {
      expect(extractClientIp(mkReq({}))).toBe("unknown");
    });

    it('XFF + XRI both whitespace → "unknown"', () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "   ", "x-real-ip": "   " })),
      ).toBe("unknown");
    });

    it('empty XFF empty XRI → "unknown"', () => {
      expect(
        extractClientIp(mkReq({ "x-forwarded-for": "", "x-real-ip": "" })),
      ).toBe("unknown");
    });
  });

  describe("never returns null/undefined (audit log NOT NULL contract)", () => {
    it("always a string", () => {
      const samples: Record<string, string>[] = [
        {},
        { "x-forwarded-for": "1.2.3.4" },
        { "x-real-ip": "5.6.7.8" },
        { "x-forwarded-for": "" },
      ];
      for (const headers of samples) {
        const result = extractClientIp(mkReq(headers));
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});
