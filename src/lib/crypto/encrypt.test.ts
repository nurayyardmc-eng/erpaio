import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./encrypt";

describe("crypto/encrypt", () => {
  describe("encrypt + decrypt roundtrip", () => {
    it("ascii text", () => {
      const text = "hello world";
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it("empty string", () => {
      expect(decrypt(encrypt(""))).toBe("");
    });

    it("turkish characters preserved", () => {
      const text = "ÇĞİÖŞÜçğıöşü — KVKK aydınlatma";
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it("long text (10KB)", () => {
      const text = "a".repeat(10_000);
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it("special characters and json", () => {
      const text = JSON.stringify({ a: 1, b: ["x", "y"], c: null });
      expect(decrypt(encrypt(text))).toBe(text);
    });
  });

  describe("ciphertext properties", () => {
    it("same plaintext produces different ciphertexts (IV randomized)", () => {
      const a = encrypt("identical");
      const b = encrypt("identical");
      expect(a).not.toBe(b);
    });

    it("ciphertext format: ivHex:tagHex:encHex", () => {
      const c = encrypt("x");
      const parts = c.split(":");
      expect(parts).toHaveLength(3);
      // IV = 16 bytes = 32 hex chars
      expect(parts[0]).toMatch(/^[0-9a-f]{32}$/);
      // GCM auth tag = 16 bytes = 32 hex chars
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
      // ciphertext is at least 1 byte for "x"
      expect(parts[2]).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("tamper detection (GCM authentication)", () => {
    it("flipped ciphertext bit fails", () => {
      const c = encrypt("secret");
      const [iv, tag, enc] = c.split(":");
      // Flip the last byte of ciphertext
      const flipped = enc.slice(0, -2) + (enc.slice(-2) === "ff" ? "00" : "ff");
      const tampered = [iv, tag, flipped].join(":");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("flipped auth tag fails", () => {
      const c = encrypt("secret");
      const [iv, tag, enc] = c.split(":");
      const badTag = tag.slice(0, -2) + (tag.slice(-2) === "ff" ? "00" : "ff");
      expect(() => decrypt([iv, badTag, enc].join(":"))).toThrow();
    });

    it("wrong IV fails", () => {
      const c = encrypt("secret");
      const [, tag, enc] = c.split(":");
      const wrongIv = "0".repeat(32);
      expect(() => decrypt([wrongIv, tag, enc].join(":"))).toThrow();
    });
  });
});
