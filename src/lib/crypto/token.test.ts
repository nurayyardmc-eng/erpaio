import { describe, it, expect } from "vitest";
import { generateSecureToken, DEFAULT_TOKEN_BYTES } from "./token";

describe("crypto/token/generateSecureToken", () => {
  it("returns a 43-char base64url string (32 bytes → 43 chars no padding)", () => {
    const t = generateSecureToken();
    expect(t.length).toBe(43);
  });

  it("base64url charset only (URL-safe, no +/= )", () => {
    const t = generateSecureToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toContain("+");
    expect(t).not.toContain("/");
    expect(t).not.toContain("=");
  });

  it("two consecutive calls produce different tokens (entropy)", () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });

  it("custom byte count produces proportionally sized output", () => {
    // 16 bytes → 22 chars (base64url, no padding)
    expect(generateSecureToken(16).length).toBe(22);
    // 64 bytes → 86 chars
    expect(generateSecureToken(64).length).toBe(86);
  });

  it("DEFAULT_TOKEN_BYTES = 32 (256-bit entropy regression marker)", () => {
    expect(DEFAULT_TOKEN_BYTES).toBe(32);
  });

  it("zero bytes → empty string", () => {
    expect(generateSecureToken(0)).toBe("");
  });

  it("multiple invocations: collision rate effectively 0 (sample 100)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateSecureToken());
    }
    expect(set.size).toBe(100);
  });

  it("never contains whitespace or control chars", () => {
    const t = generateSecureToken();
    expect(t).not.toMatch(/\s/);
    expect(t).not.toMatch(/[\x00-\x1F]/);
  });
});
