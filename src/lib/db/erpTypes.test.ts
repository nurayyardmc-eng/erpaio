import { describe, it, expect } from "vitest";
import { ERP_TYPES } from "./erpTypes";

describe("db/ERP_TYPES", () => {
  it("contains 4 canonical ERP types", () => {
    expect(ERP_TYPES).toEqual(["nebim_v3", "sap", "dynamics365", "postgres"]);
  });

  it("includes Microsoft Dynamics 365 (MS SQL backed)", () => {
    expect(ERP_TYPES).toContain("dynamics365");
  });

  it("includes Nebim V3 (Turkish ERP, MS SQL backed)", () => {
    expect(ERP_TYPES).toContain("nebim_v3");
  });

  it("includes SAP (Oracle backed)", () => {
    expect(ERP_TYPES).toContain("sap");
  });

  it("includes postgres (modern ERPs, generic)", () => {
    expect(ERP_TYPES).toContain("postgres");
  });

  it("no duplicates", () => {
    const unique = new Set(ERP_TYPES);
    expect(unique.size).toBe(ERP_TYPES.length);
  });
});
