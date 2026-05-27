import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { emailVerificationToken: { create: createMock } },
}));

import { createEmailVerificationToken } from "./createEmailVerificationToken";

describe("auth/createEmailVerificationToken", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: "tok" });
  });

  it("returns plaintext raw + Date expiresAt", async () => {
    const r = await createEmailVerificationToken("u1");
    expect(typeof r.raw).toBe("string");
    expect(r.raw.length).toBeGreaterThan(20);
    expect(r.expiresAt).toBeInstanceOf(Date);
  });

  it("expiresAt is ~24 hours in the future", async () => {
    const before = Date.now();
    const r = await createEmailVerificationToken("u1");
    const diff = r.expiresAt.getTime() - before;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThan(ONE_DAY - 1000);
    expect(diff).toBeLessThan(ONE_DAY + 1000);
  });

  it("persists tokenHash + userId + expiresAt only (no plaintext)", async () => {
    await createEmailVerificationToken("user-X");
    const call = createMock.mock.calls[0][0];
    expect(call.data.userId).toBe("user-X");
    expect(typeof call.data.tokenHash).toBe("string");
    expect(call.data.tokenHash.length).toBe(64); // SHA-256 hex
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it("SECURITY: persisted tokenHash is NOT the plaintext raw", async () => {
    const r = await createEmailVerificationToken("u1");
    const call = createMock.mock.calls[0][0];
    expect(call.data.tokenHash).not.toBe(r.raw);
  });

  it("two consecutive calls return DIFFERENT tokens (non-deterministic)", async () => {
    const r1 = await createEmailVerificationToken("u1");
    const r2 = await createEmailVerificationToken("u1");
    expect(r1.raw).not.toBe(r2.raw);
  });
});
