import { describe, it, expect } from "vitest";
import { passwordResetEmail } from "./passwordResetEmail";

const RESET_URL = "https://erpaio.test/reset-password?token=abc123";

describe("auth/passwordResetEmail", () => {
  describe("subject", () => {
    it("starts with 'ERPAIO —' brand prefix", () => {
      const { subject } = passwordResetEmail(RESET_URL);
      expect(subject.startsWith("ERPAIO —")).toBe(true);
    });

    it("mentions password reset (regression marker)", () => {
      expect(passwordResetEmail(RESET_URL).subject).toContain("Şifre sıfırlama");
    });
  });

  describe("html body", () => {
    it("starts with <!doctype html>", () => {
      const { html } = passwordResetEmail(RESET_URL);
      expect(html.trimStart().startsWith("<!doctype html>")).toBe(true);
    });

    it("contains brand wordmark", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain(">ERPAIO<");
    });

    it("contains heading 'Şifre Sıfırlama'", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain("Şifre Sıfırlama");
    });

    it("mentions 1-hour validity", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain("1 saat geçerlidir");
    });

    it("CTA button labeled 'Şifreyi sıfırla'", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain(">Şifreyi sıfırla<");
    });

    it("embeds reset URL in CTA href", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain(`href="${RESET_URL}"`);
    });

    it("includes 'not-you' safety footer", () => {
      expect(passwordResetEmail(RESET_URL).html).toContain("Bu talebi siz yapmadıysanız");
    });

    it("uses brand-black #0A0A0A CTA", () => {
      expect(passwordResetEmail(RESET_URL).html).toMatch(/background:#0A0A0A/);
    });

    it("no <style> blocks (email client safety)", () => {
      expect(passwordResetEmail(RESET_URL).html).not.toMatch(/<style[\s>]/i);
    });
  });

  describe("URL handling", () => {
    it("URL with query params + ampersand preserved verbatim", () => {
      // Note: caller's responsibility — passwordResetEmail does NOT escape.
      // Tokens come from generateSecureToken (base64url, URL-safe).
      const url = "https://erpaio.test/reset?t=abc&utm=x";
      expect(passwordResetEmail(url).html).toContain(`href="${url}"`);
    });

    it("empty URL still composes (defensive)", () => {
      expect(passwordResetEmail("").html).toContain('href=""');
    });
  });
});
