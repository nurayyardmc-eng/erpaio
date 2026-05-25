import { describe, it, expect } from "vitest";
import { maskEmail } from "./maskEmail";

describe("auth/maskEmail", () => {
  it("multi-char local part → first letter + ***@domain", () => {
    expect(maskEmail("ali@firma.com")).toBe("a***@firma.com");
    expect(maskEmail("user.name@example.co.uk")).toBe("u***@example.co.uk");
  });

  it("single-char local part → *@domain (no first-letter exposure)", () => {
    expect(maskEmail("a@b.com")).toBe("*@b.com");
  });

  it("preserves full domain (including subdomain + TLD)", () => {
    expect(maskEmail("test@mail.acme.co.tr")).toBe("t***@mail.acme.co.tr");
  });

  it("no @ sign → '***'", () => {
    expect(maskEmail("notanemail")).toBe("***");
  });

  it("@ at start (no local part) → '***'", () => {
    expect(maskEmail("@domain.com")).toBe("***");
  });

  it("empty string → '***'", () => {
    expect(maskEmail("")).toBe("***");
  });

  it("turkish characters in local part → first char preserved", () => {
    expect(maskEmail("şirket@firma.com")).toBe("ş***@firma.com");
  });

  it("uppercase preserved (not normalized)", () => {
    expect(maskEmail("Ali@FIRMA.com")).toBe("A***@FIRMA.com");
  });

  it("plus addressing (+tag) in local part hidden", () => {
    expect(maskEmail("user+tag@example.com")).toBe("u***@example.com");
  });

  it("dots in local part hidden", () => {
    expect(maskEmail("first.last@example.com")).toBe("f***@example.com");
  });

  it("never includes original local part beyond first letter (regression marker)", () => {
    const r = maskEmail("supersecretuser@example.com");
    expect(r).not.toContain("supersecretuser");
    expect(r).not.toContain("upersecretuser");
  });

  it("multiple @ chars treated as if first @ is the separator", () => {
    // "a@b@c.com" → at index 1; local = "a"; domain = "@b@c.com"
    expect(maskEmail("a@b@c.com")).toBe("*@b@c.com");
  });
});
