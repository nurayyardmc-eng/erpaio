import { describe, it, expect } from "vitest";
import { getDialect, dialectFromErpType } from "./dialect";

describe("db/dialect", () => {
  describe("getDialect", () => {
    it("mssql info", () => {
      const d = getDialect("mssql");
      expect(d.name).toBe("SQL Server");
      expect(d.paramPrefix).toBe("@");
      expect(d.comments.line).toBe("--");
    });

    it("oracle info uses : paramPrefix", () => {
      expect(getDialect("oracle").paramPrefix).toBe(":");
    });

    it("postgres info uses $ paramPrefix", () => {
      expect(getDialect("postgres").paramPrefix).toBe("$");
    });

    it("mysql info uses ? paramPrefix", () => {
      expect(getDialect("mysql").paramPrefix).toBe("?");
    });
  });

  describe("sampleRowsLimit produces dialect-correct SQL", () => {
    it("mssql uses TOP + dbo. prefix + [bracket] quoting + NOLOCK", () => {
      const sql = getDialect("mssql").sampleRowsLimit("Users", 5, ["id", "name"]);
      expect(sql).toContain("TOP 5");
      expect(sql).toContain("dbo.[Users]");
      expect(sql).toContain("[id], [name]");
      expect(sql).toContain("WITH (NOLOCK)");
    });

    it("oracle uses ROWNUM <= n", () => {
      const sql = getDialect("oracle").sampleRowsLimit("USERS", 3, ["ID"]);
      expect(sql).toContain("ROWNUM <= 3");
      expect(sql).toContain("FROM USERS");
    });

    it("postgres uses LIMIT n with double-quoted identifiers", () => {
      const sql = getDialect("postgres").sampleRowsLimit("users", 7, ["id"]);
      expect(sql).toContain("LIMIT 7");
      expect(sql).toContain('"users"');
      expect(sql).toContain('"id"');
    });

    it("mysql uses LIMIT n with backtick identifiers", () => {
      const sql = getDialect("mysql").sampleRowsLimit("users", 10, ["id"]);
      expect(sql).toContain("LIMIT 10");
      expect(sql).toContain("`users`");
      expect(sql).toContain("`id`");
    });
  });

  describe("dialectFromErpType", () => {
    it("nebim_v3 → mssql", () => {
      expect(dialectFromErpType("nebim_v3")).toBe("mssql");
    });

    it("dynamics365 → mssql", () => {
      expect(dialectFromErpType("dynamics365")).toBe("mssql");
    });

    it("sap / sap_ecc → oracle", () => {
      expect(dialectFromErpType("sap")).toBe("oracle");
      expect(dialectFromErpType("sap_ecc")).toBe("oracle");
    });

    it("oracle_ebs → oracle", () => {
      expect(dialectFromErpType("oracle_ebs")).toBe("oracle");
    });

    it("postgres → postgres", () => {
      expect(dialectFromErpType("postgres")).toBe("postgres");
    });

    it("mysql / odoo → mysql", () => {
      expect(dialectFromErpType("mysql")).toBe("mysql");
      expect(dialectFromErpType("odoo")).toBe("mysql");
    });

    it("unknown → mssql (sane default)", () => {
      expect(dialectFromErpType("xyz")).toBe("mssql");
      expect(dialectFromErpType("")).toBe("mssql");
    });
  });

  describe("schemaQuery sanity check", () => {
    it("all dialects return a non-empty schema query string", () => {
      for (const d of ["mssql", "oracle", "postgres", "mysql"] as const) {
        expect(getDialect(d).schemaQuery.trim().length).toBeGreaterThan(20);
      }
    });

    it("mssql + mysql + postgres queries include INFORMATION_SCHEMA-style references", () => {
      expect(getDialect("mssql").schemaQuery.toLowerCase()).toContain("information_schema");
      expect(getDialect("postgres").schemaQuery.toLowerCase()).toContain("information_schema");
      expect(getDialect("mysql").schemaQuery.toLowerCase()).toContain("information_schema");
    });

    it("oracle uses USER_TAB_COLUMNS", () => {
      expect(getDialect("oracle").schemaQuery).toContain("USER_TAB_COLUMNS");
    });
  });
});
