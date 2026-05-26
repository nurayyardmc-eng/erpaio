import { describe, it, expect } from "vitest";
import { isOwnerOrAdmin, isOwner, requireOwnerOrAdmin } from "./role";

function reqWithLang(lang: "tr" | "en"): Request {
  const headers = new Headers();
  headers.set("accept-language", lang);
  return new Request("https://example.test/api/x", { headers });
}

describe("auth/role/isOwnerOrAdmin", () => {
  it("owner → true", () => {
    expect(isOwnerOrAdmin("owner")).toBe(true);
  });

  it("admin → true", () => {
    expect(isOwnerOrAdmin("admin")).toBe(true);
  });

  it("viewer → false", () => {
    expect(isOwnerOrAdmin("viewer")).toBe(false);
  });

  it("unknown role → false (regression guard for new roles)", () => {
    expect(isOwnerOrAdmin("operator")).toBe(false);
    expect(isOwnerOrAdmin("Owner")).toBe(false); // case sensitive
    expect(isOwnerOrAdmin("OWNER")).toBe(false);
  });

  it("empty string → false", () => {
    expect(isOwnerOrAdmin("")).toBe(false);
  });

  it("null/undefined → false (defensive)", () => {
    expect(isOwnerOrAdmin(null)).toBe(false);
    expect(isOwnerOrAdmin(undefined)).toBe(false);
  });

  it("case-sensitive (regression marker)", () => {
    expect(isOwnerOrAdmin("Admin")).toBe(false);
    expect(isOwnerOrAdmin("ADMIN")).toBe(false);
  });
});

describe("auth/role/isOwner", () => {
  it("owner → true", () => {
    expect(isOwner("owner")).toBe(true);
  });

  it("admin → false (NOT owner — irreversible actions blocked)", () => {
    expect(isOwner("admin")).toBe(false);
  });

  it("viewer → false", () => {
    expect(isOwner("viewer")).toBe(false);
  });

  it("null/undefined → false", () => {
    expect(isOwner(null)).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });

  it("case-sensitive (regression marker)", () => {
    expect(isOwner("Owner")).toBe(false);
    expect(isOwner("OWNER")).toBe(false);
  });

  it("stricter than isOwnerOrAdmin (subset)", () => {
    const roles = ["owner", "admin", "viewer", "unknown", ""];
    for (const r of roles) {
      if (isOwner(r)) {
        expect(isOwnerOrAdmin(r)).toBe(true);
      }
    }
  });
});

describe("auth/role/requireOwnerOrAdmin", () => {
  it("owner → null (allowed)", () => {
    expect(requireOwnerOrAdmin(reqWithLang("tr"), "owner")).toBeNull();
  });

  it("admin → null (allowed)", () => {
    expect(requireOwnerOrAdmin(reqWithLang("tr"), "admin")).toBeNull();
  });

  it("viewer → 403 Response with default tr message", async () => {
    const res = requireOwnerOrAdmin(reqWithLang("tr"), "viewer");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Yalnızca admin.");
  });

  it("viewer + en locale → 403 Response with en message", async () => {
    const res = requireOwnerOrAdmin(reqWithLang("en"), "viewer");
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Admin only.");
  });

  it("custom texts override the default", async () => {
    const res = requireOwnerOrAdmin(reqWithLang("tr"), "viewer", {
      tr: "Yalnızca yönetici silebilir.",
      en: "Only admins can delete.",
    });
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Yalnızca yönetici silebilir.");
  });

  it("null/undefined role → 403 (defensive)", () => {
    expect(requireOwnerOrAdmin(reqWithLang("tr"), null)).not.toBeNull();
    expect(requireOwnerOrAdmin(reqWithLang("tr"), undefined)).not.toBeNull();
  });
});
