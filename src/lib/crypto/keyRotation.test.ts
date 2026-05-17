import { describe, it, expect } from "vitest";
import { hashEncryptionKey } from "./keyRotation";

describe("crypto/keyRotation", () => {
  describe("hashEncryptionKey", () => {
    it("returns 64-char hex (SHA-256)", () => {
      const hash = hashEncryptionKey("test-key");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", () => {
      expect(hashEncryptionKey("a")).toBe(hashEncryptionKey("a"));
    });

    it("different inputs → different hashes (collision resistance proxy)", () => {
      expect(hashEncryptionKey("a")).not.toBe(hashEncryptionKey("b"));
      expect(hashEncryptionKey("0".repeat(64))).not.toBe(hashEncryptionKey("1".repeat(64)));
    });

    it("matches known SHA-256 vector ('abc')", () => {
      // RFC 4634 test vector — sanity check that we're actually SHA-256
      expect(hashEncryptionKey("abc")).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
    });

    it("handles unicode without throwing", () => {
      expect(hashEncryptionKey("şifre çözümü")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("hash is reversibility-resistant in spirit (one-way)", () => {
      // Trivial guard: hash output != input
      const input = "0".repeat(64);
      expect(hashEncryptionKey(input)).not.toBe(input);
    });
  });
});
