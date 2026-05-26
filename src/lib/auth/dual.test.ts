import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextAuth + Prisma BEFORE importing the SUT.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    apiToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { authenticate, getAuth, requireAuth } from "./dual";
import { hashApiToken } from "./apiToken";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

function mkReq(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/x", { headers });
}

const VALID_TOKEN = "tok_abcdefghijklmnopqrstuvwxyz1234567890"; // >= 16 char
const VALID_HASH = hashApiToken(VALID_TOKEN);

describe("auth/dual/authenticate", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(prisma.apiToken.findUnique).mockReset();
    vi.mocked(prisma.apiToken.update).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.apiToken.update).mockResolvedValue({} as any);
  });

  it("no auth header + no session → null", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect(await authenticate(mkReq())).toBeNull();
  });

  it("Bearer token < 16 chars → ignored, falls through to session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const res = await authenticate(mkReq({ authorization: "Bearer short" }));
    expect(res).toBeNull();
    expect(prisma.apiToken.findUnique).not.toHaveBeenCalled();
  });

  it("valid Bearer + active token → token auth", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValueOnce({
      id: "t_1",
      revoked: false,
      expiresAt: null,
      user: { id: "u_1", email: "a@b.co", role: "admin", tenantId: "ten_1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await authenticate(mkReq({ authorization: `Bearer ${VALID_TOKEN}` }));
    expect(res).toEqual({
      id: "u_1",
      email: "a@b.co",
      tenantId: "ten_1",
      role: "admin",
      authMethod: "token",
      tokenId: "t_1",
    });
    expect(prisma.apiToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: VALID_HASH },
      include: expect.any(Object),
    });
  });

  it("revoked token → null", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValueOnce({
      id: "t_1",
      revoked: true,
      expiresAt: null,
      user: { id: "u_1", email: "a@b.co", role: "admin", tenantId: "ten_1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect(await authenticate(mkReq({ authorization: `Bearer ${VALID_TOKEN}` }))).toBeNull();
  });

  it("expired token → null", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValueOnce({
      id: "t_1",
      revoked: false,
      expiresAt: new Date(Date.now() - 60_000),
      user: { id: "u_1", email: "a@b.co", role: "admin", tenantId: "ten_1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect(await authenticate(mkReq({ authorization: `Bearer ${VALID_TOKEN}` }))).toBeNull();
  });

  it("future-expiry token → ok", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValueOnce({
      id: "t_1",
      revoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "u_1", email: "a@b.co", role: "admin", tenantId: "ten_1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await authenticate(mkReq({ authorization: `Bearer ${VALID_TOKEN}` }));
    expect(res?.authMethod).toBe("token");
  });

  it("session fallback when no Bearer", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "u_s", email: "s@b.co", tenantId: "ten_s", role: "viewer" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await authenticate(mkReq());
    expect(res).toEqual({
      id: "u_s",
      email: "s@b.co",
      tenantId: "ten_s",
      role: "viewer",
      authMethod: "session",
    });
  });
});

describe("auth/dual/requireAuth", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("authenticated → { user }", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "u", email: "e", tenantId: "t", role: "admin" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await requireAuth(mkReq());
    expect("user" in res).toBe(true);
  });

  it("unauthenticated → { error: 401 Response }", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const res = await requireAuth(mkReq());
    expect("error" in res).toBe(true);
    if ("error" in res) {
      expect(res.error.status).toBe(401);
    }
  });
});

describe("auth/dual/getAuth", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("authenticated → { user }", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "u", email: "e", tenantId: "t", role: "admin" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await getAuth(mkReq());
    expect(res).not.toBeNull();
    expect(res!.user.id).toBe("u");
  });

  it("unauthenticated → null", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect(await getAuth(mkReq())).toBeNull();
  });
});
