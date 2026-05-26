import { describe, it, expect } from "vitest";
import { isTokenUsable } from "./oneTimeToken";

const NOW = new Date("2026-05-27T12:00:00Z");
const futureExp = new Date(NOW.getTime() + 60_000);
const pastExp = new Date(NOW.getTime() - 60_000);

describe("auth/oneTimeToken/isTokenUsable", () => {
  it("null → false (token row missing)", () => {
    expect(isTokenUsable(null, NOW)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isTokenUsable(undefined, NOW)).toBe(false);
  });

  it("fresh + unused → true", () => {
    expect(isTokenUsable({ usedAt: null, expiresAt: futureExp }, NOW)).toBe(true);
  });

  it("used (usedAt set) → false", () => {
    expect(
      isTokenUsable({ usedAt: new Date(NOW.getTime() - 1_000), expiresAt: futureExp }, NOW),
    ).toBe(false);
  });

  it("expired → false", () => {
    expect(isTokenUsable({ usedAt: null, expiresAt: pastExp }, NOW)).toBe(false);
  });

  it("expired AND used → false (defensive — either condition alone is enough)", () => {
    expect(
      isTokenUsable({ usedAt: new Date(NOW.getTime() - 5_000), expiresAt: pastExp }, NOW),
    ).toBe(false);
  });

  it("exactly at expiry boundary → false (expiresAt < now, strict)", () => {
    expect(isTokenUsable({ usedAt: null, expiresAt: NOW }, NOW)).toBe(false);
  });

  it("1ms before expiry → true", () => {
    const justBefore = new Date(NOW.getTime() + 1);
    expect(isTokenUsable({ usedAt: null, expiresAt: justBefore }, NOW)).toBe(true);
  });

  it("default now uses real Date.now()", () => {
    // future expiry — should be usable
    const r = isTokenUsable({ usedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    expect(r).toBe(true);
  });
});
