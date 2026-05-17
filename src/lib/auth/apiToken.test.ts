import { describe, it, expect } from "vitest";
import { generateApiToken, hashApiToken } from "./apiToken";

describe("auth/apiToken", () => {
  describe("generateApiToken", () => {
    it("returns a base64url string", () => {
      const token = generateApiToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("returns 32 bytes (~43 chars in base64url, no padding)", () => {
      const token = generateApiToken();
      expect(token.length).toBe(43);
    });

    it("each call returns a unique token", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateApiToken()));
      expect(tokens.size).toBe(100);
    });

    it("token has >= 16 chars (auth gate requirement)", () => {
      // dual.ts.authenticate checks `if (raw.length >= 16)` before lookup
      expect(generateApiToken().length).toBeGreaterThanOrEqual(16);
    });

    it("no padding chars in output (base64url, not base64)", () => {
      const token = generateApiToken();
      expect(token).not.toContain("=");
      expect(token).not.toContain("+");
      expect(token).not.toContain("/");
    });
  });

  describe("hashApiToken", () => {
    it("returns SHA-256 hex (64 chars)", () => {
      const hash = hashApiToken("test-token");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic — same input → same hash", () => {
      expect(hashApiToken("xyz")).toBe(hashApiToken("xyz"));
    });

    it("different inputs → different hashes", () => {
      expect(hashApiToken("a")).not.toBe(hashApiToken("b"));
    });

    it("handles empty string without throwing", () => {
      expect(hashApiToken("")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("hashes generated tokens deterministically (lookup key consistency)", () => {
      const token = generateApiToken();
      expect(hashApiToken(token)).toBe(hashApiToken(token));
    });

    it("matches known SHA-256 vector ('abc')", () => {
      expect(hashApiToken("abc")).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
    });
  });
});
