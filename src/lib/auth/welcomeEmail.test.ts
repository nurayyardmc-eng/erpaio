import { describe, it, expect } from "vitest";
import { welcomeEmailHtml } from "./welcomeEmail";

const BASE_URL = "https://erpaio.test";

describe("auth/welcomeEmail/welcomeEmailHtml", () => {
  describe("content invariants", () => {
    it("contains brand wordmark 'ERPAIO'", () => {
      const html = welcomeEmailHtml("Ali", "Acme", "https://erpaio.test/verify?t=x", BASE_URL);
      expect(html).toContain(">ERPAIO<");
    });

    it("greets user by name", () => {
      const html = welcomeEmailHtml("Ali", "Acme", "x", BASE_URL);
      expect(html).toContain("Hoş geldiniz, Ali");
    });

    it("mentions tenant name", () => {
      const html = welcomeEmailHtml("X", "Acme Corp", "x", BASE_URL);
      expect(html).toContain("Acme Corp");
    });

    it("includes verify URL in CTA href", () => {
      const verifyUrl = "https://erpaio.test/verify-email?token=abc123";
      const html = welcomeEmailHtml("X", "Y", verifyUrl, BASE_URL);
      expect(html).toContain(`href="${verifyUrl}"`);
    });

    it("includes baseUrl in dashboard CTA", () => {
      const html = welcomeEmailHtml("X", "Y", "x", "https://my-instance.test");
      expect(html).toContain('href="https://my-instance.test/login"');
    });

    it("includes 14-day trial copy", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html).toContain("14 gün");
    });

    it("includes 24-hour verification window copy", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html).toContain("24 saat geçerli");
    });
  });

  describe("XSS escape (security boundary)", () => {
    it("name with <script> escaped", () => {
      const html = welcomeEmailHtml("<script>alert(1)</script>", "Y", "x", BASE_URL);
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("tenantName with HTML escaped", () => {
      const html = welcomeEmailHtml("X", "<b>Bold</b>", "x", BASE_URL);
      expect(html).not.toContain("<b>Bold</b>");
      expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    });

    it("ampersand in name escaped", () => {
      const html = welcomeEmailHtml("Ali & Veli", "X", "x", BASE_URL);
      expect(html).toContain("Ali &amp; Veli");
    });
  });

  describe("structure", () => {
    it("starts with <!doctype html>", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html.trimStart().startsWith("<!doctype html>")).toBe(true);
    });

    it("no <style> blocks (email client safety)", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html).not.toMatch(/<style[\s>]/i);
    });

    it("includes support email", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html).toContain("mailto:support@erpaio.com");
    });

    it("brand black #0A0A0A CTA buttons (regression marker)", () => {
      const html = welcomeEmailHtml("X", "Y", "x", BASE_URL);
      expect(html).toMatch(/background:#0A0A0A/);
    });
  });

  describe("default baseUrl arg", () => {
    it("omitted → uses env or production fallback", () => {
      const html = welcomeEmailHtml("X", "Y", "x");
      // baseUrl is in the html somewhere as "<base>/login"
      expect(html).toMatch(/href="https?:\/\/.+\/login"/);
    });
  });
});
