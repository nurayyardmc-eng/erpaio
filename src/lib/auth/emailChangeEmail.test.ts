import { describe, it, expect } from "vitest";
import { emailChangeConfirmEmail } from "./emailChangeEmail";

const VERIFY = "https://erpaio.test/auth/email-changed?token=abc";

describe("auth/emailChangeEmail/emailChangeConfirmEmail", () => {
  describe("English variant (locale === 'en')", () => {
    const { subject, html } = emailChangeConfirmEmail("en", VERIFY);

    it("subject is English copy", () => {
      expect(subject).toBe("Confirm your new ERPAIO email");
    });

    it("body contains English heading", () => {
      expect(html).toContain("Confirm new email");
    });

    it("body contains 24-hour validity copy in English", () => {
      expect(html).toContain("valid for 24 hours");
    });

    it("CTA button labeled in English", () => {
      expect(html).toContain("Confirm Email Change");
    });

    it("verify URL embedded in CTA href", () => {
      expect(html).toContain(`href="${VERIFY}"`);
    });
  });

  describe("Turkish variant (locale === 'tr' default)", () => {
    const { subject, html } = emailChangeConfirmEmail("tr", VERIFY);

    it("subject is Turkish copy", () => {
      expect(subject).toBe("Yeni ERPAIO email adresinizi onaylayın");
    });

    it("body contains Turkish heading", () => {
      expect(html).toContain("Yeni email adresinizi onaylayın");
    });

    it("body contains 24-hour validity copy in Turkish", () => {
      expect(html).toContain("24 saat geçerli");
    });

    it("CTA button labeled in Turkish", () => {
      expect(html).toContain("Email Değişikliğini Onayla");
    });

    it("verify URL embedded", () => {
      expect(html).toContain(`href="${VERIFY}"`);
    });
  });

  describe("locale fallback", () => {
    it("unknown locale → TR (regression marker)", () => {
      const { subject } = emailChangeConfirmEmail("ar", VERIFY);
      expect(subject).toContain("ERPAIO");
      // Should match TR
      expect(subject).toBe("Yeni ERPAIO email adresinizi onaylayın");
    });

    it("empty locale → TR", () => {
      expect(emailChangeConfirmEmail("", VERIFY).subject).toContain("onaylayın");
    });
  });

  describe("structure invariants", () => {
    it("both variants start with <!doctype html>", () => {
      expect(emailChangeConfirmEmail("en", VERIFY).html.trimStart().startsWith("<!doctype html>")).toBe(true);
      expect(emailChangeConfirmEmail("tr", VERIFY).html.trimStart().startsWith("<!doctype html>")).toBe(true);
    });

    it("brand wordmark present in both", () => {
      expect(emailChangeConfirmEmail("en", VERIFY).html).toContain(">ERPAIO<");
      expect(emailChangeConfirmEmail("tr", VERIFY).html).toContain(">ERPAIO<");
    });

    it("no <style> blocks (email client safety)", () => {
      expect(emailChangeConfirmEmail("en", VERIFY).html).not.toMatch(/<style[\s>]/i);
    });

    it("brand black CTA both variants", () => {
      expect(emailChangeConfirmEmail("en", VERIFY).html).toMatch(/background:#0A0A0A/);
      expect(emailChangeConfirmEmail("tr", VERIFY).html).toMatch(/background:#0A0A0A/);
    });

    it("English mentions correct fallback wording about original email staying active", () => {
      expect(emailChangeConfirmEmail("en", VERIFY).html).toContain("current email will stay active");
    });

    it("Turkish mentions correct fallback wording", () => {
      expect(emailChangeConfirmEmail("tr", VERIFY).html).toContain("Mevcut email");
    });
  });
});
