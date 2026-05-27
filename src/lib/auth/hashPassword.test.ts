import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { hashPassword, PASSWORD_HASH_ROUNDS } from "./hashPassword";

describe("auth/hashPassword", () => {
  it("PASSWORD_HASH_ROUNDS is 12 (OWASP minimum modern)", () => {
    expect(PASSWORD_HASH_ROUNDS).toBe(12);
  });

  it("PASSWORD_HASH_ROUNDS is at least 10 (OWASP minimum 2023)", () => {
    expect(PASSWORD_HASH_ROUNDS).toBeGreaterThanOrEqual(10);
  });

  it("returns a non-empty string", async () => {
    const h = await hashPassword("hunter2");
    expect(typeof h).toBe("string");
    expect(h.length).toBeGreaterThan(20);
  });

  it("output is bcrypt-format ($2a$ or $2b$ prefix)", async () => {
    const h = await hashPassword("hunter2");
    expect(h).toMatch(/^\$2[ayb]\$/);
  });

  it("hash verifies against the same plain via bcrypt.compare", async () => {
    const h = await hashPassword("Test-Pass-123");
    expect(await bcrypt.compare("Test-Pass-123", h)).toBe(true);
  });

  it("hash does NOT verify against different plain", async () => {
    const h = await hashPassword("right");
    expect(await bcrypt.compare("wrong", h)).toBe(false);
  });

  it("two calls with same plain return DIFFERENT hashes (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
    // Both still verify
    expect(await bcrypt.compare("same", h1)).toBe(true);
    expect(await bcrypt.compare("same", h2)).toBe(true);
  });

  it("hash encodes the work factor (12 → $12$)", async () => {
    const h = await hashPassword("test");
    // Format: $2a$12$.....salt+hash
    expect(h).toMatch(/^\$2[ayb]\$12\$/);
  });

  it("empty password still hashes (no validation here)", async () => {
    const h = await hashPassword("");
    expect(h).toMatch(/^\$2[ayb]\$12\$/);
    expect(await bcrypt.compare("", h)).toBe(true);
  });
});
