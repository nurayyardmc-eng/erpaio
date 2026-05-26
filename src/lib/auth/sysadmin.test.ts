import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies BEFORE importing the SUT.
vi.mock("@/lib/auth/dual", () => ({
  getAuth: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireSysAdmin } from "./sysadmin";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

function mkReq(): Request {
  return new Request("https://example.test/api/admin/x");
}

describe("auth/sysadmin/requireSysAdmin", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("no session → 401", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce(null);
    const res = await requireSysAdmin(mkReq());
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error.status).toBe(401);
  });

  it("session + sysadmin user → { ok: true, userId, tenantId }", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      user: { id: "u_sys", tenantId: "t_1", role: "admin", email: "s@b.co", authMethod: "session" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: true } as any);
    const res = await requireSysAdmin(mkReq());
    expect("ok" in res && res.ok).toBe(true);
    if ("ok" in res) {
      expect(res.userId).toBe("u_sys");
      expect(res.tenantId).toBe("t_1");
    }
  });

  it("session + non-sysadmin user → 403", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      user: { id: "u_n", tenantId: "t_1", role: "viewer", authMethod: "session" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: false } as any);
    const res = await requireSysAdmin(mkReq());
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error.status).toBe(403);
  });

  it("session + user-not-found in DB → 403", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      user: { id: "u_gone", tenantId: "t_1", role: "admin", authMethod: "session" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    const res = await requireSysAdmin(mkReq());
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error.status).toBe(403);
  });

  it("DB lookup scoped to authenticated user id (multi-tenant boundary)", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      user: { id: "u_check", tenantId: "t_1", role: "admin", authMethod: "session" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isSysAdmin: true } as any);
    await requireSysAdmin(mkReq());
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u_check" },
      select: { isSysAdmin: true },
    });
  });
});
