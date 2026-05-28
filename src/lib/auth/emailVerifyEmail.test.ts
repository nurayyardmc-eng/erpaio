import { describe, it, expect } from "vitest";
import { emailVerificationEmail } from "./emailVerifyEmail";

const VERIFY_URL = "https://erpaio.test/verify-email?token=abc";

describe("auth/emailVerifyEmail/emailVerificationEmail", () => {
  describe("subject", () => {
    it("contains brand + 'Email doğrulama'", () => {
      const { subject } = emailVerificationEmail(VERIFY_URL);
      expect(subject).toContain("ERPAIO");
      expect(subject).toContain("doğrulayın");
    });

    it("exact subject string (regression marker)", () => {
      expect(emailVerificationEmail(VERIFY_URL).subject).toBe(
        "ERPAIO email adresinizi doğrulayın",
      );
    });
  });

  describe("html body", () => {
    it("starts with <!doctype html>", () => {
      expect(emailVerificationEmail(VERIFY_URL).html.trimStart().startsWith("<!doctype html>")).toBe(true);
    });

    it("contains brand wordmark", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain(">ERPAIO<");
    });

    it("heading 'Email Doğrulama'", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain(">Email Doğrulama<");
    });

    it("24-hour validity copy", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain("24 saat geçerli");
    });

    it("CTA label 'Email&apos;i Doğrula' (escaped apostrophe)", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain("Email&apos;i Doğrula");
    });

    it("embeds verify URL in CTA href", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain(`href="${VERIFY_URL}"`);
    });

    it("safety footer ('Bu talebi siz yapmadıysanız')", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toContain("Bu talebi siz yapmadıysanız");
    });

    it("brand black #0A0A0A CTA", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).toMatch(/background:#0A0A0A/);
    });

    it("no <style> blocks (email client safe)", () => {
      expect(emailVerificationEmail(VERIFY_URL).html).not.toMatch(/<style[\s>]/i);
    });
  });

  describe("URL handling", () => {
    it("URL with query params preserved", () => {
      const url = "https://erpaio.test/verify?t=abc&utm=email";
      expect(emailVerificationEmail(url).html).toContain(`href="${url}"`);
    });

    it("empty URL renders defensively (no crash)", () => {
      expect(emailVerificationEmail("").html).toContain('href=""');
    });
  });

  describe("locale: en", () => {
    it("EN subject", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").subject).toBe(
        "Verify your ERPAIO email address",
      );
    });

    it("EN heading 'Email Verification'", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").html).toContain(">Email Verification<");
    });

    it("EN CTA 'Verify Email'", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").html).toContain(">Verify Email<");
    });

    it("EN 24-hour copy", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").html).toContain("24 hours");
    });

    it("EN safety footer", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").html).toContain("didn't request this");
    });

    it("EN embeds verify URL", () => {
      expect(emailVerificationEmail(VERIFY_URL, "en").html).toContain(`href="${VERIFY_URL}"`);
    });

    it("unknown locale defaults to TR (back-compat)", () => {
      const { subject } = emailVerificationEmail(VERIFY_URL, "fr");
      expect(subject).toBe("ERPAIO email adresinizi doğrulayın");
    });
  });
});
