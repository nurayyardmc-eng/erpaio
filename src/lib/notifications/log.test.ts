import { describe, it, expect } from "vitest";
import { maskRecipient } from "./log";

describe("maskRecipient", () => {
  describe("email", () => {
    it("masks local part to first char + ***", () => {
      expect(maskRecipient("email", "user@example.com")).toBe("u***@example.com");
    });

    it("preserves domain exactly", () => {
      expect(maskRecipient("email", "ali@firma.com.tr")).toBe("a***@firma.com.tr");
    });

    it("single-char local part still masked", () => {
      expect(maskRecipient("email", "a@b.com")).toBe("a***@b.com");
    });

    it("malformed email without @ returns as-is", () => {
      expect(maskRecipient("email", "no-at-sign")).toBe("no-at-sign");
    });
  });

  describe("whatsapp", () => {
    it("masks middle of phone number", () => {
      expect(maskRecipient("whatsapp", "whatsapp:+905551234567")).toBe("whatsapp***4567");
    });

    it("short recipient unchanged (no PII to mask)", () => {
      expect(maskRecipient("whatsapp", "+90555")).toBe("+90555");
    });
  });

  describe("push", () => {
    it("masks middle of expo push token (8 prefix + last 4)", () => {
      // slice(0, 8) = "Exponent", slice(-4) = "nop]"
      expect(maskRecipient("push", "ExponentPushToken[abcdefghijklmnop]"))
        .toBe("Exponent***nop]");
    });
  });

  describe("other channels", () => {
    it("slack/teams/webhook return as-is (URL, not PII)", () => {
      expect(maskRecipient("slack", "https://hooks.slack.com/services/T01/B02/abc"))
        .toBe("https://hooks.slack.com/services/T01/B02/abc");
      expect(maskRecipient("teams", "https://outlook.office.com/webhook/...")).toBe("https://outlook.office.com/webhook/...");
      expect(maskRecipient("webhook", "https://example.com/hook")).toBe("https://example.com/hook");
    });
  });

  describe("nullish", () => {
    it("null → null", () => {
      expect(maskRecipient("email", null)).toBeNull();
    });

    it("undefined → null", () => {
      expect(maskRecipient("email", undefined)).toBeNull();
    });

    it("empty string → null (falsy short-circuit)", () => {
      expect(maskRecipient("email", "")).toBeNull();
    });
  });
});
