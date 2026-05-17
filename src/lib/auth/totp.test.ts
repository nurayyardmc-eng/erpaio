import { describe, it, expect } from "vitest";
import { TOTP, Secret } from "otpauth";
import { generateSecret, provisioningUri, verifyCode } from "./totp";

function currentCode(base32: string): string {
  const totp = new TOTP({
    issuer: "ERPAIO",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32),
  });
  return totp.generate();
}

describe("auth/totp", () => {
  describe("generateSecret", () => {
    it("returns base32 and encrypted form", () => {
      const { base32, encrypted } = generateSecret();
      // RFC 4648 base32 — 32 chars (size 20 bytes), uppercase A-Z + 2-7
      expect(base32).toMatch(/^[A-Z2-7]+$/);
      expect(base32.length).toBeGreaterThanOrEqual(16);
      // encrypted is colon-separated triple from encrypt()
      expect(encrypted.split(":")).toHaveLength(3);
      // encrypted != plaintext
      expect(encrypted).not.toContain(base32);
    });

    it("each call produces a unique secret", () => {
      const a = generateSecret();
      const b = generateSecret();
      expect(a.base32).not.toBe(b.base32);
    });
  });

  describe("provisioningUri", () => {
    it("produces otpauth URI with issuer + email", () => {
      const { base32 } = generateSecret();
      const uri = provisioningUri("user@example.com", base32);
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
      expect(uri).toContain("issuer=ERPAIO");
      // label is URL-encoded
      expect(uri).toMatch(/user(%40|@)example\.com/);
    });
  });

  describe("verifyCode", () => {
    it("accepts current valid code", () => {
      const { base32, encrypted } = generateSecret();
      const code = currentCode(base32);
      expect(verifyCode(encrypted, code)).toBe(true);
    });

    it("rejects non-6-digit input early (without decrypt)", () => {
      const { encrypted } = generateSecret();
      expect(verifyCode(encrypted, "12345")).toBe(false);
      expect(verifyCode(encrypted, "1234567")).toBe(false);
      expect(verifyCode(encrypted, "abcdef")).toBe(false);
      expect(verifyCode(encrypted, "")).toBe(false);
    });

    it("rejects wrong code", () => {
      const { encrypted } = generateSecret();
      expect(verifyCode(encrypted, "000000")).toBe(false);
    });

    it("rejects when encrypted secret is malformed", () => {
      expect(verifyCode("not:valid:secret", "123456")).toBe(false);
      expect(verifyCode("", "123456")).toBe(false);
    });

    it("rejects code from a different secret", () => {
      const a = generateSecret();
      const b = generateSecret();
      const codeForA = currentCode(a.base32);
      // Vanishingly small chance of collision; expect false
      expect(verifyCode(b.encrypted, codeForA)).toBe(false);
    });
  });
});
