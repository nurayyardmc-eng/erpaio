import { describe, it, expect } from "vitest";
import { looksLikeRecoveryCode, normalizeRecoveryCode } from "./recovery";

describe("recovery code format", () => {
  describe("looksLikeRecoveryCode", () => {
    it("8 char with dash → true", () => {
      expect(looksLikeRecoveryCode("ABCD-2345")).toBe(true);
    });

    it("8 char no dash → true", () => {
      expect(looksLikeRecoveryCode("ABCD2345")).toBe(true);
    });

    it("lowercase → true (case-insensitive)", () => {
      expect(looksLikeRecoveryCode("abcd-2345")).toBe(true);
    });

    it("6-digit TOTP → false", () => {
      expect(looksLikeRecoveryCode("123456")).toBe(false);
    });

    it("contains forbidden char (1) → false", () => {
      expect(looksLikeRecoveryCode("ABCD-1234")).toBe(false);
    });

    it("contains forbidden char (O) → false", () => {
      expect(looksLikeRecoveryCode("ABCO-2345")).toBe(false);
    });

    it("too short → false", () => {
      expect(looksLikeRecoveryCode("ABCD-234")).toBe(false);
    });

    it("too long → false", () => {
      expect(looksLikeRecoveryCode("ABCDE-2345")).toBe(false);
    });

    it("empty → false", () => {
      expect(looksLikeRecoveryCode("")).toBe(false);
    });

    it("whitespace tolerant", () => {
      expect(looksLikeRecoveryCode("  ABCD-2345  ")).toBe(true);
    });
  });

  describe("normalizeRecoveryCode", () => {
    it("dash removed, uppercased", () => {
      expect(normalizeRecoveryCode("abcd-2345")).toBe("ABCD2345");
    });

    it("whitespace stripped", () => {
      expect(normalizeRecoveryCode("  abcd 2345  ")).toBe("ABCD2345");
    });

    it("invalid chars dropped", () => {
      // 1/O/I/L not in alphabet — should be stripped
      expect(normalizeRecoveryCode("ABCD-23OL")).toBe("ABCD23");
    });
  });
});
