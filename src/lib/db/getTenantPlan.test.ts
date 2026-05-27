import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { tenant: { findUnique: findUniqueMock } },
}));

import { getTenantPlan } from "./getTenantPlan";

describe("db/getTenantPlan", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns plan string when tenant exists", async () => {
    findUniqueMock.mockResolvedValueOnce({ plan: "pro" });
    const r = await getTenantPlan("t1");
    expect(r).toBe("pro");
  });

  it("returns null when tenant not found", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const r = await getTenantPlan("nope");
    expect(r).toBeNull();
  });

  it("returns null when plan field is null on row", async () => {
    findUniqueMock.mockResolvedValueOnce({ plan: null });
    const r = await getTenantPlan("t1");
    expect(r).toBeNull();
  });

  it("scopes lookup to provided tenantId", async () => {
    findUniqueMock.mockResolvedValueOnce({ plan: "starter" });
    await getTenantPlan("tenant-XYZ");
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "tenant-XYZ" });
  });

  it("select only plan field (no PII leak)", async () => {
    findUniqueMock.mockResolvedValueOnce({ plan: "free" });
    await getTenantPlan("t1");
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.select).toEqual({ plan: true });
  });

  it("supports all 3 known plan values", async () => {
    for (const plan of ["starter", "pro", "enterprise"]) {
      findUniqueMock.mockResolvedValueOnce({ plan });
      expect(await getTenantPlan("t1")).toBe(plan);
    }
  });
});
