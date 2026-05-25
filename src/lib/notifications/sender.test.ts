import { describe, it, expect } from "vitest";
import { pickEmailSender, fromDomainOf } from "./sender";

const DEFAULT = "ERPAIO <noreply@erpaio.app>";
const DOMAIN = "erpaio.app";

describe("notifications/sender/pickEmailSender", () => {
  describe("enterprise plan + branding", () => {
    it("brandingSenderName + enterprise → custom from", () => {
      expect(pickEmailSender("enterprise", "Acme Corp", DEFAULT, DOMAIN)).toBe(
        "Acme Corp <noreply@erpaio.app>",
      );
    });

    it("non-enterprise plan ignores branding", () => {
      expect(pickEmailSender("pro", "Acme Corp", DEFAULT, DOMAIN)).toBe(DEFAULT);
      expect(pickEmailSender("starter", "Acme Corp", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("enterprise but empty branding → default", () => {
      expect(pickEmailSender("enterprise", "", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("enterprise but whitespace-only branding → default", () => {
      expect(pickEmailSender("enterprise", "   ", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("branding trimmed in output", () => {
      expect(pickEmailSender("enterprise", "  Acme  ", DEFAULT, DOMAIN)).toBe(
        "Acme <noreply@erpaio.app>",
      );
    });
  });

  describe("null/undefined inputs", () => {
    it("plan null → default", () => {
      expect(pickEmailSender(null, "Acme", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("plan undefined → default", () => {
      expect(pickEmailSender(undefined, "Acme", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("branding null + enterprise → default", () => {
      expect(pickEmailSender("enterprise", null, DEFAULT, DOMAIN)).toBe(DEFAULT);
    });

    it("branding undefined + enterprise → default", () => {
      expect(pickEmailSender("enterprise", undefined, DEFAULT, DOMAIN)).toBe(DEFAULT);
    });
  });

  describe("case sensitivity", () => {
    it("'Enterprise' (capitalized) does NOT match (canonical lowercase)", () => {
      expect(pickEmailSender("Enterprise", "Acme", DEFAULT, DOMAIN)).toBe(DEFAULT);
    });
  });

  describe("uses provided fromDomain", () => {
    it("custom domain in output", () => {
      expect(
        pickEmailSender("enterprise", "Acme", DEFAULT, "custom.example.com"),
      ).toBe("Acme <noreply@custom.example.com>");
    });
  });
});

describe("notifications/sender/fromDomainOf", () => {
  it("extracts domain from 'Name <email>' format", () => {
    expect(fromDomainOf("ERPAIO <noreply@erpaio.app>")).toBe("erpaio.app");
  });

  it("extracts domain from raw email", () => {
    expect(fromDomainOf("noreply@erpaio.app")).toBe("erpaio.app");
  });

  it("subdomain preserved", () => {
    expect(fromDomainOf("Acme <hello@mail.acme.com>")).toBe("mail.acme.com");
  });

  it("malformed (no @) → fallback", () => {
    expect(fromDomainOf("no-at-here")).toBe("erpaio.app");
  });

  it("empty → fallback", () => {
    expect(fromDomainOf("")).toBe("erpaio.app");
  });

  it("custom fallback respected", () => {
    expect(fromDomainOf("no-at-here", "custom.fallback")).toBe("custom.fallback");
  });

  it("uppercase email preserved (caller may normalize)", () => {
    expect(fromDomainOf("Hello <NOREPLY@ERPAIO.APP>")).toBe("ERPAIO.APP");
  });
});
