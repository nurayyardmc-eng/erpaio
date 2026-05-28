import { describe, it, expect } from "vitest";
import { readOnlyUserSql } from "./readOnlyUserSql";
import { ERP_TYPES } from "./erpTypes";

describe("db/readOnlyUserSql", () => {
  it("returns SQL + notes for every ERP_TYPES entry", () => {
    for (const erp of ERP_TYPES) {
      const r = readOnlyUserSql(erp);
      expect(typeof r.sql).toBe("string");
      expect(r.sql.length).toBeGreaterThan(50);
      expect(typeof r.notes).toBe("string");
      expect(r.notes.length).toBeGreaterThan(10);
    }
  });

  describe("Nebim V3 (MS SQL)", () => {
    const r = readOnlyUserSql("nebim_v3");

    it("uses CREATE LOGIN + CREATE USER (T-SQL idiom)", () => {
      expect(r.sql).toContain("CREATE LOGIN erpaio_readonly");
      expect(r.sql).toContain("CREATE USER erpaio_readonly");
    });

    it("grants ONLY db_datareader (no write)", () => {
      expect(r.sql).toContain("db_datareader");
      expect(r.sql).not.toContain("db_datawriter");
      expect(r.sql).not.toContain("db_owner");
    });

    it("includes GO batch separators (T-SQL convention)", () => {
      expect(r.sql).toMatch(/\nGO\n/);
    });

    it("has placeholder for password + db name", () => {
      expect(r.sql).toContain("<güçlü-şifre>");
      expect(r.sql).toContain("<veritabani-adi>");
    });
  });

  describe("Dynamics 365 (MS SQL — same as Nebim)", () => {
    it("uses same T-SQL pattern as Nebim", () => {
      const nebim = readOnlyUserSql("nebim_v3");
      const d365 = readOnlyUserSql("dynamics365");
      expect(d365.sql).toBe(nebim.sql);
    });
  });

  describe("PostgreSQL", () => {
    const r = readOnlyUserSql("postgres");

    it("uses CREATE ROLE WITH LOGIN", () => {
      expect(r.sql).toContain("CREATE ROLE erpaio_readonly WITH LOGIN");
    });

    it("grants USAGE + SELECT on public schema", () => {
      expect(r.sql).toContain("GRANT USAGE ON SCHEMA public");
      expect(r.sql).toContain("GRANT SELECT ON ALL TABLES IN SCHEMA public");
    });

    it("sets default privilege for future tables", () => {
      expect(r.sql).toContain("ALTER DEFAULT PRIVILEGES");
    });

    it("does NOT grant any write/DDL privileges", () => {
      expect(r.sql).not.toContain("INSERT");
      expect(r.sql).not.toContain("UPDATE");
      expect(r.sql).not.toContain("DELETE");
      expect(r.sql).not.toContain("CREATE TABLE");
      expect(r.sql).not.toContain("SUPERUSER");
    });

    it("notes mention default privilege", () => {
      expect(r.notes.toLowerCase()).toContain("default privilege");
    });
  });

  describe("SAP / Oracle", () => {
    const r = readOnlyUserSql("sap");

    it("uses CREATE USER + IDENTIFIED BY (Oracle idiom)", () => {
      expect(r.sql).toContain("CREATE USER erpaio_readonly IDENTIFIED BY");
    });

    it("grants CONNECT (Oracle bare-min for login)", () => {
      expect(r.sql).toContain("GRANT CONNECT TO erpaio_readonly");
    });

    it("references SAPSR3 default schema", () => {
      expect(r.sql).toContain("SAPSR3");
    });

    it("notes warn about SELECT ANY TABLE scope", () => {
      expect(r.notes).toContain("SAP basis");
    });
  });

  it("ALL outputs use erpaio_readonly as username (consistency)", () => {
    for (const erp of ERP_TYPES) {
      const r = readOnlyUserSql(erp);
      expect(r.sql).toContain("erpaio_readonly");
    }
  });

  it("ALL outputs include password placeholder (security UX)", () => {
    for (const erp of ERP_TYPES) {
      const r = readOnlyUserSql(erp);
      expect(r.sql).toContain("<güçlü-şifre>");
    }
  });
});
