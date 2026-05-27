import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { passwordResetToken: { create: createMock } },
}));

import { createPasswordResetToken } from "./createPasswordResetToken";

describe("auth/createPasswordResetToken", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: "tok" });
  });

  it("returns plaintext raw + Date expiresAt", async () => {
    const r = await createPasswordResetToken("u1");
    expect(typeof r.raw).toBe("string");
    expect(r.raw.length).toBeGreaterThan(20);
    expect(r.expiresAt).toBeInstanceOf(Date);
  });

  it("expiresAt is ~1 hour in the future (SHORTER than email verify)", async () => {
    const before = Date.now();
    const r = await createPasswordResetToken("u1");
    const diff = r.expiresAt.getTime() - before;
    const ONE_HOUR = 60 * 60 * 1000;
    expect(diff).toBeGreaterThan(ONE_HOUR - 1000);
    expect(diff).toBeLessThan(ONE_HOUR + 1000);
  });

  it("persists userId + tokenHash + expiresAt (no plaintext)", async () => {
    await createPasswordResetToken("user-X");
    const call = createMock.mock.calls[0][0];
    expect(call.data.userId).toBe("user-X");
    expect(typeof call.data.tokenHash).toBe("string");
    expect(call.data.tokenHash.length).toBe(64); // SHA-256 hex
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it("SECURITY: persisted tokenHash is NOT the plaintext", async () => {
    const r = await createPasswordResetToken("u1");
    const call = createMock.mock.calls[0][0];
    expect(call.data.tokenHash).not.toBe(r.raw);
  });

  it("two consecutive calls return DIFFERENT tokens (non-deterministic)", async () => {
    const r1 = await createPasswordResetToken("u1");
    const r2 = await createPasswordResetToken("u1");
    expect(r1.raw).not.toBe(r2.raw);
  });

  it("TTL shorter than email verification (security tradeoff)", async () => {
    const before = Date.now();
    const r = await createPasswordResetToken("u1");
    const diffHours = (r.expiresAt.getTime() - before) / (60 * 60 * 1000);
    // Password reset = 1h, email verify = 24h
    expect(diffHours).toBeLessThan(2);
  });
});
