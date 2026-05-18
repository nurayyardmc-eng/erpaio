import { describe, it, expect } from "vitest";
import { listProfiles, loadProfile, profileToPromptContext, type ErpProfile } from "./index";

describe("erpProfiles", () => {
  describe("listProfiles", () => {
    it("returns at least the 3 known profile slugs", () => {
      const profiles = listProfiles();
      expect(profiles).toContain("nebim_v3");
      expect(profiles).toContain("sap_ecc");
      expect(profiles).toContain("oracle_ebs");
    });
  });

  describe("loadProfile", () => {
    it("loads nebim_v3 profile with canonical_tables", () => {
      const p = loadProfile("nebim_v3");
      expect(p).not.toBeNull();
      expect(p!.canonical_tables).toBeDefined();
      expect(Object.keys(p!.canonical_tables).length).toBeGreaterThan(0);
    });

    it("returns null for unknown slug", () => {
      expect(loadProfile("unknown-erp")).toBeNull();
      expect(loadProfile("")).toBeNull();
    });

    it("cached on second call — same reference", () => {
      const a = loadProfile("nebim_v3");
      const b = loadProfile("nebim_v3");
      expect(a).toBe(b); // same reference (cache hit)
    });
  });

  describe("profileToPromptContext", () => {
    const minimalProfile: ErpProfile = {
      name: "Test ERP",
      slug: "test",
      description: "Bir test profili",
      canonical_tables: {
        Users: {
          description: "Kullanıcılar tablosu",
          important_columns: [
            { name: "id", type: "int", meaning: "PK" },
            { name: "status", type: "int", values: { "1": "active", "0": "disabled" } },
          ],
        },
      },
    };

    it("includes profile name in header", () => {
      const ctx = profileToPromptContext(minimalProfile);
      expect(ctx).toContain("# Test ERP");
    });

    it("includes description when present", () => {
      const ctx = profileToPromptContext(minimalProfile);
      expect(ctx).toContain("Bir test profili");
    });

    it("renders canonical tables with columns and meanings", () => {
      const ctx = profileToPromptContext(minimalProfile);
      expect(ctx).toContain("### Users — Kullanıcılar tablosu");
      expect(ctx).toContain("id (int) — PK");
    });

    it("renders enum values inline { k=v, ... }", () => {
      const ctx = profileToPromptContext(minimalProfile);
      // Object.entries key order — numeric strings sorted by V8 (0 before 1);
      // test'in iki yöntemde de geçmesini iste.
      expect(ctx).toMatch(/status.*\{ (?:1=active, 0=disabled|0=disabled, 1=active) \}/);
    });

    it("includes glossary section when present", () => {
      const p: ErpProfile = {
        ...minimalProfile,
        glossary: { "satış": "Sales", "fatura": "Invoice" },
      };
      const ctx = profileToPromptContext(p);
      expect(ctx).toContain("TÜRKÇE → TABLO/KOLON SÖZLÜK");
      expect(ctx).toContain("- satış: Sales");
      expect(ctx).toContain("- fatura: Invoice");
    });

    it("skips glossary section when empty/absent", () => {
      const ctx = profileToPromptContext(minimalProfile);
      expect(ctx).not.toContain("SÖZLÜK");
    });

    it("includes conventions section when present", () => {
      const p: ErpProfile = {
        ...minimalProfile,
        conventions: ["Kural 1: NOLOCK kullan", "Kural 2: dbo. prefix"],
      };
      const ctx = profileToPromptContext(p);
      expect(ctx).toContain("ÖNEMLI KURALLAR");
      expect(ctx).toContain("- Kural 1: NOLOCK kullan");
    });

    it("renders relationships under table", () => {
      const p: ErpProfile = {
        ...minimalProfile,
        canonical_tables: {
          Orders: {
            description: "Siparişler",
            important_columns: [{ name: "userId" }],
            relationships: [{ with: "Users", on: "Orders.userId = Users.id", type: "many_to_one" }],
          },
        },
      };
      const ctx = profileToPromptContext(p);
      expect(ctx).toContain("İlişkiler:");
      expect(ctx).toContain("Users ON Orders.userId = Users.id (many_to_one)");
    });

    it("renders common_queries with SQL code block", () => {
      const p: ErpProfile = {
        ...minimalProfile,
        common_queries: [
          {
            q_pattern: ["Aktif kullanıcılar", "Active users"],
            sql: "SELECT * FROM Users WHERE status = 1",
            explanation: "status=1 active",
          },
        ],
      };
      const ctx = profileToPromptContext(p);
      expect(ctx).toContain("SIK SORULAN KALIPLAR");
      expect(ctx).toContain("Aktif kullanıcılar / Active users");
      expect(ctx).toContain("```sql");
      expect(ctx).toContain("SELECT * FROM Users WHERE status = 1");
      expect(ctx).toContain("Açıklama: status=1 active");
    });

    it("column without type → '?' placeholder", () => {
      const p: ErpProfile = {
        ...minimalProfile,
        canonical_tables: {
          T: { description: "x", important_columns: [{ name: "col" }] },
        },
      };
      const ctx = profileToPromptContext(p);
      expect(ctx).toContain("col (?)");
    });
  });
});
