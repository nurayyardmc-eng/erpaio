import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("auth/slugify", () => {
  it("lowercases ASCII letters", () => {
    expect(slugify("HelloWorld")).toBe("helloworld");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("acme corp")).toBe("acme-corp");
  });

  it("collapses multiple non-alnum chars into single hyphen", () => {
    expect(slugify("a   b___c")).toBe("a-b-c");
    expect(slugify("a!!!b")).toBe("a-b");
  });

  it("strips diacritics: ş→s, ğ→g, ç→c, ı→ (combining drop)", () => {
    expect(slugify("Şirket")).toBe("sirket");
    expect(slugify("Ağaç")).toBe("agac");
    expect(slugify("İstanbul")).toBe("istanbul");
  });

  it("strips all combining marks (NFD), keeps base letter", () => {
    expect(slugify("café")).toBe("cafe");
    expect(slugify("naïve")).toBe("naive");
    expect(slugify("Münchner")).toBe("munchner");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
    expect(slugify("   spaced   ")).toBe("spaced");
  });

  it("truncates at 40 chars (inclusive)", () => {
    const result = slugify("a".repeat(100));
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result).toBe("a".repeat(40));
  });

  it("preserves digits", () => {
    expect(slugify("Acme 2026")).toBe("acme-2026");
    expect(slugify("v3-test")).toBe("v3-test");
  });

  it("digit-only input still slugs", () => {
    expect(slugify("12345")).toBe("12345");
  });

  it("empty string → random fallback 't-XXXXXX'", () => {
    const r = slugify("");
    expect(r).toMatch(/^t-[a-z0-9]{1,6}$/);
  });

  it("only-symbols input → random fallback (since all stripped)", () => {
    const r = slugify("!!! ??? ###");
    expect(r).toMatch(/^t-[a-z0-9]{1,6}$/);
  });

  it("only-diacritic-marks input → random fallback", () => {
    // Combining marks alone (no base letters) → empty after NFD strip
    const r = slugify("\u0301\u0303"); // acute + tilde alone
    expect(r).toMatch(/^t-[a-z0-9]{1,6}$/);
  });

  it("emoji and other non-ASCII → hyphens or dropped", () => {
    expect(slugify("Acme 🚀 Corp")).toBe("acme-corp");
  });

  it("mixed case + diacritics + symbols normalized", () => {
    expect(slugify("Türk Şirketi A.Ş.")).toBe("turk-sirketi-a-s");
  });

  it("deterministic for non-empty input (no randomness)", () => {
    expect(slugify("Acme Corp")).toBe(slugify("Acme Corp"));
    expect(slugify("Şirket")).toBe(slugify("Şirket"));
  });

  it("never returns empty string", () => {
    // Fallback path guarantees non-empty.
    expect(slugify("").length).toBeGreaterThan(0);
    expect(slugify("   ").length).toBeGreaterThan(0);
    expect(slugify("!").length).toBeGreaterThan(0);
  });

  it("output contains only [a-z0-9-] for non-empty path", () => {
    expect(slugify("Şirket A.Ş.")).toMatch(/^[a-z0-9-]+$/);
    expect(slugify("Café Müller")).toMatch(/^[a-z0-9-]+$/);
  });

  it("Türkçe ı handled (NFD doesn't decompose it; gets dropped via [^a-z0-9])", () => {
    // 'ı' (U+0131) is its own base letter (no combining mark to strip).
    // The [^a-z0-9] filter drops it → "kayıt" → "kay-t".
    // Note: this is a known limitation; ASCII fold for ı would need explicit map.
    const r = slugify("kayıt");
    expect(r).toBe("kay-t");
  });
});
