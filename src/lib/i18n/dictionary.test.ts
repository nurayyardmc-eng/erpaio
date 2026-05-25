import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
} from "./dictionary";

/**
 * i18n constants smoke-test (Track HHHHHH).
 *
 * SUPPORTED_LOCALES + LOCALE_LABELS + DEFAULT_LOCALE form the i18n
 * boundary. Server (resolveLocale) and middleware (landing redirect)
 * both depend on these — typo or mismatch silently breaks language
 * detection.
 */

describe("i18n/dictionary constants", () => {
  describe("SUPPORTED_LOCALES", () => {
    it("contains tr and en", () => {
      expect(SUPPORTED_LOCALES).toContain("tr");
      expect(SUPPORTED_LOCALES).toContain("en");
    });

    it("has at least 2 entries", () => {
      expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(2);
    });

    it("no duplicates", () => {
      expect(new Set(SUPPORTED_LOCALES).size).toBe(SUPPORTED_LOCALES.length);
    });

    it("every locale is lowercase 2-letter ISO code", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(locale).toMatch(/^[a-z]{2}$/);
      }
    });
  });

  describe("DEFAULT_LOCALE", () => {
    it("is tr (Turkish-first product)", () => {
      expect(DEFAULT_LOCALE).toBe("tr");
    });

    it("is a member of SUPPORTED_LOCALES", () => {
      expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
    });
  });

  describe("LOCALE_LABELS", () => {
    it("has a label for every supported locale", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(LOCALE_LABELS[locale]).toBeTruthy();
        expect(typeof LOCALE_LABELS[locale]).toBe("string");
      }
    });

    it("Turkish label is 'Türkçe' (regression marker)", () => {
      expect(LOCALE_LABELS.tr).toBe("Türkçe");
    });

    it("English label is 'English' (regression marker)", () => {
      expect(LOCALE_LABELS.en).toBe("English");
    });

    it("no empty labels", () => {
      for (const label of Object.values(LOCALE_LABELS)) {
        expect(label.trim().length).toBeGreaterThan(0);
      }
    });

    it("each label is in its native language (not in English)", () => {
      // "Türkçe" contains non-ASCII chars; "English" is ASCII. These signal
      // the labels are localized native names rather than always-English.
      expect(LOCALE_LABELS.tr).toMatch(/[ğüşıöç]/i);
    });
  });
});
