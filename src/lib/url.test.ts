import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { baseUrl, absoluteUrl } from "./url";

const ORIGINAL_ENV = { ...process.env };

describe("lib/url/baseUrl", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("uses NEXTAUTH_URL when set", () => {
    process.env.NEXTAUTH_URL = "https://my-instance.test";
    expect(baseUrl()).toBe("https://my-instance.test");
  });

  it("falls back to production URL when NEXTAUTH_URL unset", () => {
    delete process.env.NEXTAUTH_URL;
    expect(baseUrl()).toBe("https://erpaio.vercel.app");
  });

  it("production fallback exact string (regression marker)", () => {
    delete process.env.NEXTAUTH_URL;
    expect(baseUrl()).toBe("https://erpaio.vercel.app");
  });

  it("NEXTAUTH_URL empty string still passes through (truthy fallback rare)", () => {
    process.env.NEXTAUTH_URL = "";
    // nullish coalesce — "" is not nullish, so empty string used.
    expect(baseUrl()).toBe("");
  });
});

describe("lib/url/absoluteUrl", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NEXTAUTH_URL = "https://erpaio.test";
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("appends path verbatim", () => {
    expect(absoluteUrl("/login")).toBe("https://erpaio.test/login");
  });

  it("preserves query params", () => {
    expect(absoluteUrl("/verify?token=abc")).toBe(
      "https://erpaio.test/verify?token=abc",
    );
  });

  it("nested path", () => {
    expect(absoluteUrl("/auth/email-changed?t=x")).toBe(
      "https://erpaio.test/auth/email-changed?t=x",
    );
  });

  it("empty path → just base", () => {
    expect(absoluteUrl("")).toBe("https://erpaio.test");
  });

  it("path without leading slash (caller convention — kept verbatim)", () => {
    expect(absoluteUrl("login")).toBe("https://erpaio.testlogin");
  });
});
