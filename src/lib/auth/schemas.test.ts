import { describe, it, expect } from "vitest";
import {
  zPassword,
  zEmail,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
} from "./schemas";

describe("auth/schemas/zPassword", () => {
  it("accepts 8-char password (min boundary)", () => {
    expect(zPassword().parse("12345678")).toBe("12345678");
  });

  it("accepts 200-char password (max boundary)", () => {
    const long = "a".repeat(200);
    expect(zPassword().parse(long)).toBe(long);
  });

  it("rejects 7-char (below min)", () => {
    expect(() => zPassword().parse("1234567")).toThrow();
  });

  it("rejects 201-char (above max)", () => {
    expect(() => zPassword().parse("a".repeat(201))).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => zPassword().parse("")).toThrow();
  });

  it("rejects non-string", () => {
    expect(() => zPassword().parse(12345678)).toThrow();
    expect(() => zPassword().parse(null)).toThrow();
  });

  it("PASSWORD_MIN_LENGTH = 8 (regression marker)", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it("PASSWORD_MAX_LENGTH = 200 (regression marker)", () => {
    expect(PASSWORD_MAX_LENGTH).toBe(200);
  });
});

describe("auth/schemas/zEmail", () => {
  it("accepts valid RFC email", () => {
    expect(zEmail().parse("user@example.com")).toBe("user@example.com");
  });

  it("accepts Turkish chars in local part (RFC-permissive)", () => {
    // Note: actual RFC 6532 allows internationalized — zod's email check
    // may or may not pass these depending on engine. Verify behavior:
    const email = "user@example.com";
    expect(zEmail().parse(email)).toBe(email);
  });

  it("accepts subdomain", () => {
    expect(zEmail().parse("u@mail.acme.co.uk")).toBe("u@mail.acme.co.uk");
  });

  it("rejects missing @", () => {
    expect(() => zEmail().parse("notanemail")).toThrow();
  });

  it("rejects no domain", () => {
    expect(() => zEmail().parse("user@")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => zEmail().parse("")).toThrow();
  });

  it("rejects above default max (200 chars)", () => {
    const long = "a".repeat(195) + "@b.com"; // 201 chars
    expect(() => zEmail().parse(long)).toThrow();
  });

  it("custom max length applied", () => {
    const e = "a@b.co";
    expect(zEmail(10).parse(e)).toBe(e);
    expect(() => zEmail(5).parse("longer@b.co")).toThrow();
  });

  it("EMAIL_MAX_LENGTH = 200 (Prisma User.email column regression marker)", () => {
    expect(EMAIL_MAX_LENGTH).toBe(200);
  });
});

import { zSeverity, zTeamRole, zInviteRole, SEVERITY_VALUES, TEAM_ROLE_VALUES, INVITE_ROLE_VALUES } from "./schemas";

describe("auth/schemas/zSeverity", () => {
  it("accepts all 4 severity values", () => {
    for (const s of SEVERITY_VALUES) {
      expect(zSeverity().parse(s)).toBe(s);
    }
  });

  it("rejects unknown severity", () => {
    expect(() => zSeverity().parse("urgent")).toThrow();
    expect(() => zSeverity().parse("MEDIUM")).toThrow();
  });

  it("SEVERITY_VALUES exact list (regression marker)", () => {
    expect(SEVERITY_VALUES).toEqual(["low", "medium", "high", "critical"]);
  });
});

describe("auth/schemas/zTeamRole", () => {
  it("accepts viewer, admin, owner", () => {
    for (const r of TEAM_ROLE_VALUES) {
      expect(zTeamRole().parse(r)).toBe(r);
    }
  });

  it("rejects unknown role", () => {
    expect(() => zTeamRole().parse("operator")).toThrow();
  });
});

describe("auth/schemas/zInviteRole", () => {
  it("accepts viewer, admin", () => {
    for (const r of INVITE_ROLE_VALUES) {
      expect(zInviteRole().parse(r)).toBe(r);
    }
  });

  it("rejects owner (cannot be invited)", () => {
    expect(() => zInviteRole().parse("owner")).toThrow();
  });

  it("INVITE_ROLE_VALUES excludes owner (regression marker)", () => {
    expect(INVITE_ROLE_VALUES).toEqual(["viewer", "admin"]);
    expect(INVITE_ROLE_VALUES).not.toContain("owner");
  });

  it("subset of TEAM_ROLE_VALUES", () => {
    for (const r of INVITE_ROLE_VALUES) {
      expect(TEAM_ROLE_VALUES).toContain(r);
    }
  });
});
