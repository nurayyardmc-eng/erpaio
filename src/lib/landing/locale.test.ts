import { describe, it, expect } from "vitest";
import { resolveLocale, isLocale, SUPPORTED_LOCALES } from "./locale";

describe("lib/landing/locale/resolveLocale", () => {
  it("?lang=en wins, even with TR cookie", () => {
    expect(resolveLocale("en", "tr")).toBe("en");
  });

  it("?lang=tr wins, even with EN cookie", () => {
    expect(resolveLocale("tr", "en")).toBe("tr");
  });

  it("?lang=ar wins, even with EN cookie", () => {
    expect(resolveLocale("ar", "en")).toBe("ar");
  });

  it("no query, cookie=tr → tr", () => {
    expect(resolveLocale(undefined, "tr")).toBe("tr");
  });

  it("no query, cookie=ar → ar", () => {
    expect(resolveLocale(undefined, "ar")).toBe("ar");
  });

  it("no query, no cookie → en (default)", () => {
    expect(resolveLocale(undefined, undefined)).toBe("en");
  });

  it("invalid query value falls through to cookie", () => {
    expect(resolveLocale("xx", "tr")).toBe("tr");
  });

  it("invalid query AND invalid cookie → en", () => {
    expect(resolveLocale("xx", "yy")).toBe("en");
  });

  it("empty string query treated as invalid (falls through)", () => {
    expect(resolveLocale("", "ar")).toBe("ar");
  });

  it("uppercase query EN treated as invalid (case-sensitive — defensive)", () => {
    expect(resolveLocale("EN", "tr")).toBe("tr");
  });
});

describe("lib/landing/locale/isLocale", () => {
  it("recognizes the three supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("tr")).toBe(true);
    expect(isLocale("ar")).toBe(true);
  });

  it("rejects unknown locales", () => {
    expect(isLocale("es")).toBe(false);
    expect(isLocale("zh")).toBe(false);
    expect(isLocale("EN")).toBe(false);
  });

  it("rejects nullish / empty", () => {
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("lib/landing/locale/SUPPORTED_LOCALES", () => {
  it("exposes [en, tr, ar]", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "tr", "ar"]);
  });
});
