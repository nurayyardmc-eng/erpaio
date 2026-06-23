import { describe, it, expect, vi, beforeEach } from "vitest";

// Route-level security regression tests for POST /api/auth/reset-password.
// Mocks the side-effecting deps (DB, rate limit, password hashing) but keeps
// the REAL token-state guard (isTokenUsable), body validation (parseJsonBody),
// hashing of the token (sha256Hex) and error responses (jsonError) so the
// security invariants are exercised end-to-end through the handler.

const { findUnique, userUpdate, tokenUpdate, apiTokenUpdateMany, txn } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  userUpdate: vi.fn(),
  tokenUpdate: vi.fn(),
  apiTokenUpdateMany: vi.fn(),
  txn: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    passwordResetToken: { findUnique, update: tokenUpdate },
    user: { update: userUpdate },
    apiToken: { updateMany: apiTokenUpdateMany },
    $transaction: txn,
  },
}));

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  RATE_LIMITS: { RESET_PASSWORD: { prefix: "rp", max: 5, windowMs: 1000 } },
  enforceIpRateLimit: enforce,
}));

vi.mock("@/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn(async () => "HASHED"),
}));

import { POST } from "./route";
import { hashPassword } from "@/lib/auth/hashPassword";

const VALID_PASSWORD = "ThisIsALongValidPassword123";
const VALID_TOKEN = "tok_abcdefghijklmnop"; // >= 8 chars

function makeReq(body: unknown): Request {
  return new Request("https://erpaio.test/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforce.mockResolvedValue(null); // not rate-limited
    txn.mockResolvedValue([]);
    userUpdate.mockResolvedValue({});
    tokenUpdate.mockResolvedValue({});
    apiTokenUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("rejects with 429 when IP rate limit is exceeded (no DB lookup)", async () => {
    enforce.mockResolvedValue(new Response(null, { status: 429 }));
    const res = await POST(makeReq({ token: VALID_TOKEN, password: VALID_PASSWORD }));
    expect(res.status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects with 400 on an invalid body (token too short)", async () => {
    const res = await POST(makeReq({ token: "short", password: VALID_PASSWORD }));
    expect(res.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects with 400 when the token does not exist (no password mutation)", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ token: VALID_TOKEN, password: VALID_PASSWORD }));
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects with 400 when the token is expired", async () => {
    findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeReq({ token: VALID_TOKEN, password: VALID_PASSWORD }));
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
  });

  it("rejects with 400 when the token was already used (single-use)", async () => {
    findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      usedAt: new Date(Date.now() - 5000),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const res = await POST(makeReq({ token: VALID_TOKEN, password: VALID_PASSWORD }));
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
  });

  it("resets the password atomically and enforces single-use + session revocation on a valid token", async () => {
    findUnique.mockResolvedValue({
      id: "t1",
      userId: "u1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const res = await POST(makeReq({ token: VALID_TOKEN, password: VALID_PASSWORD }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    // password is hashed (never stored plaintext)
    expect(hashPassword).toHaveBeenCalledWith(VALID_PASSWORD);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "HASHED" },
    });

    // token marked used → single-use guarantee
    const tokenUpdateArg = tokenUpdate.mock.calls[0][0];
    expect(tokenUpdateArg.where).toEqual({ id: "t1" });
    expect(tokenUpdateArg.data.usedAt).toBeInstanceOf(Date);

    // all live API tokens revoked → password reset invalidates existing sessions
    expect(apiTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revoked: false },
      data: { revoked: true },
    });

    // all three writes happen in a single transaction (atomic)
    expect(txn).toHaveBeenCalledTimes(1);
  });
});
