import { describe, it, expect } from "vitest";
import { pickDialect } from "./dialect";

describe("ai/dialect/pickDialect", () => {
  describe("PostgreSQL branch", () => {
    it("erpType=postgres → PostgreSQL regardless of profile", () => {
      expect(pickDialect("postgres", null)).toEqual({
        name: "PostgreSQL",
        isPostgres: true,
        isMsSql: false,
      });
      expect(pickDialect("postgres", "any_profile")).toEqual({
        name: "PostgreSQL",
        isPostgres: true,
        isMsSql: false,
      });
    });
  });

  describe("SQL Server branch", () => {
    it("erpType=nebim_v3 → SQL Server", () => {
      const r = pickDialect("nebim_v3", "nebim_v3");
      expect(r.name).toBe("SQL Server");
      expect(r.isMsSql).toBe(true);
      expect(r.isPostgres).toBe(false);
    });

    it("erpType=dynamics365 → SQL Server", () => {
      expect(pickDialect("dynamics365", null).name).toBe("SQL Server");
    });

    it("erpProfile null → SQL Server fallback (legacy Nebim assumption)", () => {
      expect(pickDialect("anything", null).name).toBe("SQL Server");
      expect(pickDialect("anything", undefined).name).toBe("SQL Server");
      expect(pickDialect("anything", "").name).toBe("SQL Server");
    });

    it("erpType=sap_ecc with no profile → SQL Server (fallback)", () => {
      expect(pickDialect("sap_ecc", null).name).toBe("SQL Server");
    });
  });

  describe("Generic ERP fallback", () => {
    it("unknown erpType WITH profile → 'ERP veritabanı'", () => {
      const r = pickDialect("sap_ecc", "sap_ecc");
      expect(r.name).toBe("ERP veritabanı");
      expect(r.isPostgres).toBe(false);
      expect(r.isMsSql).toBe(false);
    });

    it("erpType=oracle_ebs with profile → generic", () => {
      const r = pickDialect("oracle_ebs", "oracle_ebs");
      expect(r.name).toBe("ERP veritabanı");
    });
  });

  describe("invariants", () => {
    it("isPostgres and isMsSql are mutually exclusive", () => {
      const cases: Array<[string | null, string | null]> = [
        ["postgres", null],
        ["nebim_v3", "nebim_v3"],
        ["dynamics365", null],
        ["sap_ecc", "sap_ecc"],
        [null, null],
        ["postgres", "postgres"],
      ];
      for (const [erp, prof] of cases) {
        const r = pickDialect(erp, prof);
        expect(r.isPostgres && r.isMsSql).toBe(false);
      }
    });

    it("name aligns with boolean flags", () => {
      const cases: Array<[string | null, string | null]> = [
        ["postgres", null],
        ["nebim_v3", null],
        ["sap_ecc", "sap_ecc"],
      ];
      for (const [erp, prof] of cases) {
        const r = pickDialect(erp, prof);
        if (r.isPostgres) expect(r.name).toBe("PostgreSQL");
        else if (r.isMsSql) expect(r.name).toBe("SQL Server");
        else expect(r.name).toBe("ERP veritabanı");
      }
    });

    it("null/undefined erpType behaves consistently", () => {
      expect(pickDialect(null, null).name).toBe("SQL Server");
      expect(pickDialect(undefined, undefined).name).toBe("SQL Server");
    });
  });
});
