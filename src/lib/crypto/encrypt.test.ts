import { describe, it, expect, vi, afterEach } from "vitest";
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

  describe("split-length guard", () => {
    it("rejects input that isn't iv:tag:ciphertext with a clear error", () => {
      expect(() => decrypt("not-encrypted")).toThrow(/format/i);
      expect(() => decrypt("only:two")).toThrow(/format/i);
      expect(() => decrypt("a:b:c:d")).toThrow(/format/i);
    });
  });

  describe("key rotation fallback", () => {
    const KEY_A = "a".repeat(64);
    const KEY_B = "b".repeat(64);

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it("decrypts ciphertext written with a previous key after rotation", async () => {
      vi.stubEnv("ENCRYPTION_KEY", KEY_A);
      vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", "");
      vi.resetModules();
      const ct = (await import("./encrypt")).encrypt("rotate-me");

      // Rotate: B becomes current, A moves to the previous-key window.
      vi.stubEnv("ENCRYPTION_KEY", KEY_B);
      vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", KEY_A);
      vi.resetModules();
      const mod = await import("./encrypt");
      expect(mod.decrypt(ct)).toBe("rotate-me");
      // fresh data uses the new current key and still round-trips
      expect(mod.decrypt(mod.encrypt("new"))).toBe("new");
    });

    it("without the previous key, old ciphertext fails with a rotation hint", async () => {
      vi.stubEnv("ENCRYPTION_KEY", KEY_A);
      vi.resetModules();
      const ct = (await import("./encrypt")).encrypt("rotate-me");

      vi.stubEnv("ENCRYPTION_KEY", KEY_B);
      vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", "");
      vi.resetModules();
      const mod = await import("./encrypt");
      expect(() => mod.decrypt(ct)).toThrow(/denendi|rotasyon/i);
    });
  });
});
