import { describe, it, expect, vi, beforeEach } from "vitest";

// Route-level tests for POST /api/auth/signup — the onboarding path.
// Covers rate limiting, body validation, email-uniqueness (409), and the
// happy path (account created → KVKK/terms/privacy consent logged → welcome
// email dispatched → tenant/user returned). Side-effecting deps are mocked;
// real parseJsonBody / jsonError / slugify run through the handler.

const { userFindUnique, tenantFindUnique, txn } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  tenantFindUnique: vi.fn(),
  txn: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    tenant: { findUnique: tenantFindUnique },
    $transaction: txn,
  },
}));

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ enforceIpRateLimit: enforce }));

vi.mock("@/lib/auth/hashPassword", () => ({ hashPassword: vi.fn(async () => "HASHED") }));
vi.mock("@/lib/auth/createEmailVerificationToken", () => ({
  createEmailVerificationToken: vi.fn(async () => ({ raw: "vtok", expiresAt: new Date() })),
}));

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn<(opts: { to: string; subject?: string; html?: string }) => void>(),
}));
vi.mock("@/lib/notifications/email", () => ({ sendEmail }));

const { recordConsent, consentContext } = vi.hoisted(() => ({
  recordConsent:
    vi.fn<(c: { consentType: string; action: string; userId: string; tenantId: string }) => Promise<void>>(),
  consentContext: vi.fn(() => ({ ipAddress: "1.2.3.4", userAgent: "test-agent" })),
}));
vi.mock("@/lib/auth/consent", () => ({
  recordConsent,
  consentContextFromRequest: consentContext,
}));

import { POST } from "./route";
import { hashPassword } from "@/lib/auth/hashPassword";

const VALID = {
  email: "new@acme.test",
  password: "ThisIsALongValidPassword123",
  name: "Jane",
  tenantName: "Acme Co",
  acceptedTerms: true,
  acceptedPrivacy: true,
};

function makeReq(body: unknown): Request {
  return new Request("https://erpaio.test/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforce.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
    tenantFindUnique.mockResolvedValue(null); // slug free
    txn.mockResolvedValue({
      tenant: {
        id: "ten1",
        slug: "acme-co",
        trialEndsAt: new Date("2027-01-01T00:00:00Z"),
        users: [{ id: "usr1", email: VALID.email }],
      },
      verifyToken: "vtok",
    });
  });

  it("returns 429 when the signup IP rate limit is hit (no DB lookup)", async () => {
    enforce.mockResolvedValue(new Response(null, { status: 429 }));
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(429);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 when the privacy/terms consent is not accepted", async () => {
    const res = await POST(makeReq({ ...VALID, acceptedTerms: false }));
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already registered (no account created)", async () => {
    userFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(409);
    expect(txn).not.toHaveBeenCalled();
  });

  it("creates the account, logs all three consents, sends the welcome email", async () => {
    const res = await POST(makeReq(VALID));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user).toEqual({ id: "usr1", email: VALID.email });
    expect(json.tenant.id).toBe("ten1");

    expect(hashPassword).toHaveBeenCalledWith(VALID.password);
    expect(txn).toHaveBeenCalledTimes(1);

    // KVKK md.5/md.7 — all three consents recorded as granted
    expect(recordConsent).toHaveBeenCalledTimes(3);
    const consentTypes = recordConsent.mock.calls.map((c) => c[0].consentType).sort();
    expect(consentTypes).toEqual(["kvkk_signup", "privacy", "terms"]);
    for (const call of recordConsent.mock.calls) {
      expect(call[0].action).toBe("granted");
      expect(call[0].userId).toBe("usr1");
      expect(call[0].tenantId).toBe("ten1");
    }

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe(VALID.email);
  });
});
