import { describe, it, expect } from "vitest";
import { ipToInt, cidrMatch } from "./ipAllowlist";

describe("security/ipAllowlist", () => {
  describe("ipToInt", () => {
    it("0.0.0.0 → 0", () => {
      expect(ipToInt("0.0.0.0")).toBe(0);
    });

    it("255.255.255.255 → 0xFFFFFFFF", () => {
      expect(ipToInt("255.255.255.255")).toBe(0xFFFFFFFF);
    });

    it("192.168.1.1 → known value", () => {
      // (192 << 24) | (168 << 16) | (1 << 8) | 1 = 3232235777
      expect(ipToInt("192.168.1.1")).toBe(3232235777);
    });

    it("10.0.0.1 → known value", () => {
      expect(ipToInt("10.0.0.1")).toBe((10 << 24 | 0 | 0 | 1) >>> 0);
    });
  });

  describe("cidrMatch", () => {
    it("exact IP match (no /N) — equal returns true", () => {
      expect(cidrMatch("192.168.1.1", "192.168.1.1")).toBe(true);
    });

    it("exact IP mismatch returns false", () => {
      expect(cidrMatch("192.168.1.2", "192.168.1.1")).toBe(false);
    });

    it("/24 subnet match — last octet within range", () => {
      expect(cidrMatch("192.168.1.5", "192.168.1.0/24")).toBe(true);
      expect(cidrMatch("192.168.1.255", "192.168.1.0/24")).toBe(true);
      expect(cidrMatch("192.168.2.1", "192.168.1.0/24")).toBe(false);
    });

    it("/16 subnet match", () => {
      expect(cidrMatch("192.168.5.10", "192.168.0.0/16")).toBe(true);
      expect(cidrMatch("192.169.0.0", "192.168.0.0/16")).toBe(false);
    });

    it("/32 single host — only exact match", () => {
      expect(cidrMatch("10.0.0.1", "10.0.0.1/32")).toBe(true);
      expect(cidrMatch("10.0.0.2", "10.0.0.1/32")).toBe(false);
    });

    it("/0 matches everything", () => {
      expect(cidrMatch("1.2.3.4", "0.0.0.0/0")).toBe(true);
      expect(cidrMatch("255.255.255.255", "0.0.0.0/0")).toBe(true);
    });

    it("empty ip or cidr returns false (defensive)", () => {
      expect(cidrMatch("", "192.168.1.0/24")).toBe(false);
      expect(cidrMatch("192.168.1.1", "")).toBe(false);
    });

    it("malformed cidr base returns false", () => {
      expect(cidrMatch("192.168.1.1", "not-an-ip/24")).toBe(false);
      expect(cidrMatch("192.168.1.1", "192.168.1.1.1/24")).toBe(false);
    });

    it("/8 large subnet — broad match", () => {
      expect(cidrMatch("10.255.255.255", "10.0.0.0/8")).toBe(true);
      expect(cidrMatch("11.0.0.0", "10.0.0.0/8")).toBe(false);
    });
  });
});
