import { describe, it, expect } from "vitest";
import { isCanonicalTable, tableReason } from "./customColumnFlag";
import type { ErpProfile } from "./index";

const profile: ErpProfile = {
  name: "Test",
  slug: "test",
  canonical_tables: {
    Users: { description: "x", important_columns: [] },
    Orders: { description: "x", important_columns: [] },
    trFatura: { description: "x", important_columns: [] },
  },
};

describe("erpProfiles/customColumnFlag/isCanonicalTable", () => {
  it("exact match → true", () => {
    expect(isCanonicalTable("Users", profile)).toBe(true);
    expect(isCanonicalTable("Orders", profile)).toBe(true);
  });

  it("case-insensitive (lowercase match)", () => {
    expect(isCanonicalTable("users", profile)).toBe(true);
    expect(isCanonicalTable("USERS", profile)).toBe(true);
    expect(isCanonicalTable("trfatura", profile)).toBe(true);
  });

  it("unknown table → false", () => {
    expect(isCanonicalTable("CustomTable", profile)).toBe(false);
    expect(isCanonicalTable("", profile)).toBe(false);
  });

  it("empty profile.canonical_tables → false for everything", () => {
    const empty: ErpProfile = { ...profile, canonical_tables: {} };
    expect(isCanonicalTable("Users", empty)).toBe(false);
  });
});

describe("erpProfiles/customColumnFlag/tableReason", () => {
  it("suffix _ozel → 'özel/yedek tablo' reason", () => {
    expect(tableReason("trFatura_ozel")).toMatch(/özel\/yedek/);
  });

  it("suffix _custom → 'özel/yedek tablo'", () => {
    expect(tableReason("Users_custom")).toMatch(/özel\/yedek/);
  });

  it("suffix _user → 'özel/yedek tablo'", () => {
    expect(tableReason("trFatura_user")).toMatch(/özel\/yedek/);
  });

  it("suffix _temp → 'özel/yedek tablo'", () => {
    expect(tableReason("Foo_temp")).toMatch(/özel\/yedek/);
  });

  it("suffix _bk → 'özel/yedek tablo'", () => {
    expect(tableReason("trFatura_bk")).toMatch(/özel\/yedek/);
  });

  it("suffix _backup → 'özel/yedek tablo'", () => {
    expect(tableReason("trFatura_backup")).toMatch(/özel\/yedek/);
  });

  it("suffix _old → 'özel/yedek tablo'", () => {
    expect(tableReason("trFatura_old")).toMatch(/özel\/yedek/);
  });

  it("suffix _test → 'özel/yedek tablo'", () => {
    expect(tableReason("trFatura_test")).toMatch(/özel\/yedek/);
  });

  it("Z_ prefix → 'müşteri özel tabloları' reason", () => {
    // Suffix regex runs first; pick names that don't end in suffix-list.
    expect(tableReason("Z_OZEL_TABLO")).toMatch(/müşteri özel/);
    expect(tableReason("z_kayit")).toMatch(/müşteri özel/);
  });

  it("X_ prefix → 'müşteri özel tabloları' reason", () => {
    expect(tableReason("X_KOMUT")).toMatch(/müşteri özel/);
    expect(tableReason("x_log_table")).toMatch(/müşteri özel/);
  });

  it("Z_/X_ prefix BUT also suffix match → suffix wins (regex order)", () => {
    // z_test: suffix _test matches first → özel/yedek reason.
    expect(tableReason("z_test")).toMatch(/özel\/yedek/);
    expect(tableReason("X_backup")).toMatch(/özel\/yedek/);
  });

  it("normal name → generic 'Profile'da tanımlı değil' reason", () => {
    expect(tableReason("MyCustomTable")).toBe("Profile'da tanımlı değil");
  });

  it("suffix matches are case-insensitive (rx /i flag)", () => {
    expect(tableReason("trFatura_OZEL")).toMatch(/özel\/yedek/);
    expect(tableReason("trFatura_OLD")).toMatch(/özel\/yedek/);
  });
});
