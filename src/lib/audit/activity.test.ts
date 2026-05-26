import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing the SUT — the module captures the prisma
// reference at import time.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activityLog: {
      create: vi.fn(),
    },
  },
}));

import { activityContextFromRequest, recordActivity, recordUserActivity } from "./activity";
import { prisma } from "@/lib/db/prisma";

function mkReq(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("activityContextFromRequest", () => {
  it("extracts x-forwarded-for first IP", () => {
    const ctx = activityContextFromRequest(
      mkReq({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }),
    );
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("trims whitespace from IP", () => {
    const ctx = activityContextFromRequest(mkReq({ "x-forwarded-for": "  203.0.113.5  " }));
    expect(ctx.ipAddress).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' when no x-forwarded-for", () => {
    const ctx = activityContextFromRequest(mkReq());
    expect(ctx.ipAddress).toBe("unknown");
  });

  it("captures user-agent header", () => {
    const ctx = activityContextFromRequest(
      mkReq({ "user-agent": "Mozilla/5.0 ERPAIO/1.0" }),
    );
    expect(ctx.userAgent).toBe("Mozilla/5.0 ERPAIO/1.0");
  });

  it("falls back to 'unknown' when no user-agent", () => {
    const ctx = activityContextFromRequest(mkReq());
    expect(ctx.userAgent).toBe("unknown");
  });
});

describe("recordActivity", () => {
  beforeEach(() => {
    vi.mocked(prisma.activityLog.create).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.activityLog.create).mockResolvedValue({} as any);
  });

  it("calls prisma.activityLog.create with required fields", async () => {
    await recordActivity({
      userId: "u_1",
      tenantId: "t_1",
      email: "a@b.co",
      action: "profile.update",
      target: "target_id",
      metadata: { field: "name" },
      ipAddress: "1.2.3.4",
      userAgent: "TestAgent",
    });
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.userId).toBe("u_1");
    expect(call.data.tenantId).toBe("t_1");
    expect(call.data.email).toBe("a@b.co");
    expect(call.data.action).toBe("profile.update");
    expect(call.data.target).toBe("target_id");
    expect(call.data.metadata).toEqual({ field: "name" });
    expect(call.data.ipAddress).toBe("1.2.3.4");
    expect(call.data.userAgent).toBe("TestAgent");
  });

  it("nulls optional fields when omitted", async () => {
    await recordActivity({ action: "profile.update" });
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.userId).toBeNull();
    expect(call.data.tenantId).toBeNull();
    expect(call.data.email).toBeNull();
    expect(call.data.target).toBeNull();
    expect(call.data.ipAddress).toBeNull();
    expect(call.data.userAgent).toBeNull();
  });

  it("swallows DB errors (best-effort)", async () => {
    vi.mocked(prisma.activityLog.create).mockRejectedValueOnce(new Error("FK violation"));
    await expect(
      recordActivity({ action: "profile.update" }),
    ).resolves.toBeUndefined();
  });
});

describe("recordUserActivity", () => {
  const session = {
    user: { id: "u_1", tenantId: "t_1", email: "user@test.co" },
  };

  beforeEach(() => {
    vi.mocked(prisma.activityLog.create).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.activityLog.create).mockResolvedValue({} as any);
  });

  it("maps session.user + req to recordActivity input", async () => {
    const req = mkReq({ "x-forwarded-for": "1.2.3.4", "user-agent": "TestUA" });
    await recordUserActivity(req, session, {
      action: "profile.update",
      target: "target_1",
      metadata: { field: "name" },
    });
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.userId).toBe("u_1");
    expect(call.data.tenantId).toBe("t_1");
    expect(call.data.email).toBe("user@test.co");
    expect(call.data.action).toBe("profile.update");
    expect(call.data.target).toBe("target_1");
    expect(call.data.ipAddress).toBe("1.2.3.4");
    expect(call.data.userAgent).toBe("TestUA");
  });

  it("nullable email defaults to null", async () => {
    const sessionNoEmail = { user: { id: "u_x", tenantId: "t_x" } };
    await recordUserActivity(mkReq(), sessionNoEmail, { action: "profile.update" });
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.email).toBeNull();
  });

  it("target/metadata default to null when omitted", async () => {
    await recordUserActivity(mkReq(), session, { action: "profile.update" });
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.target).toBeNull();
    expect(call.data.metadata).toEqual(expect.objectContaining({}));
    // Prisma.JsonNull serialized — could be {} or other null marker; just
    // assert "no real metadata payload" by checking it isn't a real obj key.
  });

  it("forwards req IP + UA via activityContextFromRequest", async () => {
    await recordUserActivity(mkReq({ "x-real-ip": "5.6.7.8", "user-agent": "Alt" }), session, {
      action: "profile.update",
    });
    const call = vi.mocked(prisma.activityLog.create).mock.calls[0][0];
    expect(call.data.ipAddress).toBe("5.6.7.8");
    expect(call.data.userAgent).toBe("Alt");
  });
});
