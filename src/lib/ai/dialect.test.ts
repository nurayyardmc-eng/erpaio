import { describe, it, expect } from "vitest";
import { pickDialect, dialectRules } from "./dialect";

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

describe("ai/dialect/dialectRules", () => {
  it("isPostgres=true returns Postgres-specific rules", () => {
    const r = dialectRules(true);
    expect(r).toMatch(/ILIKE/);
    expect(r).toMatch(/NOW\(\)/);
    expect(r).toMatch(/INTERVAL/);
    expect(r).toMatch(/date_trunc/);
    expect(r).not.toMatch(/GETDATE/);
    expect(r).not.toMatch(/N'%/);
  });

  it("isPostgres=false returns MS SQL Server-specific rules", () => {
    const r = dialectRules(false);
    expect(r).toMatch(/GETDATE/);
    expect(r).toMatch(/TOP n/);
    expect(r).toMatch(/LOWER\(col\)/);
    expect(r).toMatch(/N'%/);
    expect(r).not.toMatch(/ILIKE/);
    expect(r).not.toMatch(/date_trunc/);
  });

  it("both branches include Türkçe text comparison guidance (Turkish i/İ)", () => {
    expect(dialectRules(true)).toMatch(/TÜRKÇE TEXT KARŞILAŞTIRMA/);
    expect(dialectRules(false)).toMatch(/TÜRKÇE TEXT KARŞILAŞTIRMA/);
  });

  it("Postgres branch uses double-quoted identifier", () => {
    expect(dialectRules(true)).toMatch(/"tabloAdi"/);
  });

  it("MS SQL branch uses bracketed identifier", () => {
    expect(dialectRules(false)).toMatch(/\[tabloAdi\]/);
  });

  it("returns non-empty stable string (idempotent)", () => {
    expect(dialectRules(true)).toBe(dialectRules(true));
    expect(dialectRules(false)).toBe(dialectRules(false));
    expect(dialectRules(true).length).toBeGreaterThan(100);
    expect(dialectRules(false).length).toBeGreaterThan(100);
  });

  it("two branches return different strings", () => {
    expect(dialectRules(true)).not.toBe(dialectRules(false));
  });
});
