import { describe, it, expect } from "vitest";
import {
  isOwnerOrAdmin,
  isOwner,
  requireOwnerOrAdmin,
  requireOwner,
  DENY_OWNER_ADMIN_VIEW,
  DENY_ADMIN_EDIT,
} from "./role";

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

describe("auth/role/requireOwner", () => {
  it("owner → null (allowed)", () => {
    expect(requireOwner(reqWithLang("tr"), "owner")).toBeNull();
  });

  it("admin → 403 (stricter than requireOwnerOrAdmin)", async () => {
    const res = requireOwner(reqWithLang("tr"), "admin");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("viewer → 403 with default tr message", async () => {
    const res = requireOwner(reqWithLang("tr"), "viewer");
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Yalnızca tenant sahibi.");
  });

  it("viewer + en locale → en default", async () => {
    const res = requireOwner(reqWithLang("en"), "viewer");
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Only the tenant owner.");
  });

  it("custom texts override", async () => {
    const res = requireOwner(reqWithLang("tr"), "admin", {
      tr: "Yalnızca tenant sahibi plan değiştirebilir.",
      en: "Only the tenant owner can change the plan.",
    });
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe("Yalnızca tenant sahibi plan değiştirebilir.");
  });
});

describe("DENY constants (Track MMMMMMMMM)", () => {
  it("DENY_OWNER_ADMIN_VIEW has tr + en messages", () => {
    expect(DENY_OWNER_ADMIN_VIEW.tr).toBeTruthy();
    expect(DENY_OWNER_ADMIN_VIEW.en).toBeTruthy();
    expect(DENY_OWNER_ADMIN_VIEW.tr).not.toBe(DENY_OWNER_ADMIN_VIEW.en);
  });

  it("DENY_ADMIN_EDIT has tr + en messages", () => {
    expect(DENY_ADMIN_EDIT.tr).toBeTruthy();
    expect(DENY_ADMIN_EDIT.en).toBeTruthy();
    expect(DENY_ADMIN_EDIT.tr).not.toBe(DENY_ADMIN_EDIT.en);
  });

  it("requireOwnerOrAdmin uses DENY_OWNER_ADMIN_VIEW correctly", async () => {
    const res = requireOwnerOrAdmin(reqWithLang("tr"), "viewer", DENY_OWNER_ADMIN_VIEW);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe(DENY_OWNER_ADMIN_VIEW.tr);
  });

  it("requireOwnerOrAdmin uses DENY_ADMIN_EDIT correctly", async () => {
    const res = requireOwnerOrAdmin(reqWithLang("en"), "viewer", DENY_ADMIN_EDIT);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toBe(DENY_ADMIN_EDIT.en);
  });
});
