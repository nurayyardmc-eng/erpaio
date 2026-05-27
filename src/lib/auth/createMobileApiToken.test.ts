import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { apiToken: { create: createMock } },
}));

import { createMobileApiToken } from "./createMobileApiToken";

describe("auth/createMobileApiToken", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: "tok_id" });
  });

  it("returns raw plaintext token + expiresAt Date", async () => {
    const r = await createMobileApiToken("u1", "t1", "mobile");
    expect(typeof r.raw).toBe("string");
    expect(r.raw.length).toBeGreaterThan(20);
    expect(r.expiresAt).toBeInstanceOf(Date);
  });

  it("expiresAt is 90 days in the future", async () => {
    const before = Date.now();
    const r = await createMobileApiToken("u1", "t1", "mobile");
    const diff = r.expiresAt.getTime() - before;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    // Within 1 second tolerance
    expect(diff).toBeGreaterThan(ninetyDaysMs - 1000);
    expect(diff).toBeLessThan(ninetyDaysMs + 1000);
  });

  it("persists with userId + tenantId + name + tokenHash", async () => {
    await createMobileApiToken("user-X", "tenant-Y", "iPhone-15");
    const call = createMock.mock.calls[0][0];
    expect(call.data.userId).toBe("user-X");
    expect(call.data.tenantId).toBe("tenant-Y");
    expect(call.data.name).toBe("iPhone-15");
    expect(typeof call.data.tokenHash).toBe("string");
    expect(call.data.tokenHash.length).toBe(64); // SHA-256 hex
  });

  it("SECURITY: persisted tokenHash is NOT the plaintext", async () => {
    const r = await createMobileApiToken("u1", "t1", "mobile");
    const call = createMock.mock.calls[0][0];
    expect(call.data.tokenHash).not.toBe(r.raw);
  });

  it("two consecutive calls return DIFFERENT tokens (non-deterministic)", async () => {
    const r1 = await createMobileApiToken("u1", "t1", "mobile");
    const r2 = await createMobileApiToken("u1", "t1", "mobile");
    expect(r1.raw).not.toBe(r2.raw);
  });

  it("name field used verbatim (no trimming/coercion)", async () => {
    await createMobileApiToken("u1", "t1", "  My Phone  ");
    const call = createMock.mock.calls[0][0];
    expect(call.data.name).toBe("  My Phone  ");
  });
});
