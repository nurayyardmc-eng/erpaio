import { describe, it, expect } from "vitest";
import { alertEmailHtml, sendEmail } from "./email";

describe("notifications/email", () => {
  describe("alertEmailHtml", () => {
    it("includes severity badge in uppercase", () => {
      const html = alertEmailHtml({ severity: "critical", title: "DB down" });
      expect(html).toContain("CRITICAL ALERT");
    });

    it("escapes HTML in title to prevent injection", () => {
      const html = alertEmailHtml({
        severity: "high",
        title: "<script>alert('xss')</script>",
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes HTML in description", () => {
      const html = alertEmailHtml({
        severity: "low",
        title: "x",
        description: 'foo "bar" <b>baz</b>',
      });
      expect(html).toContain("&quot;bar&quot;");
      expect(html).toContain("&lt;b&gt;baz&lt;/b&gt;");
    });

    it("omits description block when null", () => {
      const html = alertEmailHtml({ severity: "low", title: "x", description: null });
      // Description <p> block absent
      expect(html).not.toMatch(/<p[^>]*>(?!.*ERPAIO)[^<]+<\/p>/);
    });

    it("uses default severity colors when unknown", () => {
      const html = alertEmailHtml({ severity: "alien", title: "x" });
      // Falls back to "low" palette
      expect(html).toContain("#475569"); // low fg
    });

    it("each known severity produces a unique color combo", () => {
      const sevs = ["critical", "high", "medium", "low"];
      const fgs = sevs.map((s) =>
        alertEmailHtml({ severity: s, title: "x" }).match(/border-left:4px solid (#[0-9A-F]+)/i)?.[1],
      );
      expect(new Set(fgs).size).toBe(4);
    });
  });

  describe("sendEmail without credentials", () => {
    it("returns {ok: false} when no RESEND_API_KEY", async () => {
      const res = await sendEmail({ to: "x@y.com", subject: "test", text: "body" });
      expect(res.ok).toBe(false);
      expect(res.id).toBeUndefined();
    });
  });
});
