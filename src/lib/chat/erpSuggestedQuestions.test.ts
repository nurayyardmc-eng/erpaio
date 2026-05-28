import { describe, it, expect } from "vitest";
import { erpSuggestedQuestions } from "./erpSuggestedQuestions";
import { ERP_TYPES } from "@/lib/db/erpTypes";

describe("chat/erpSuggestedQuestions", () => {
  it("returns 4 questions for every ERP_TYPES entry", () => {
    for (const erp of ERP_TYPES) {
      const qs = erpSuggestedQuestions(erp);
      expect(qs).toHaveLength(4);
    }
  });

  it("each question is non-empty string", () => {
    for (const erp of ERP_TYPES) {
      const qs = erpSuggestedQuestions(erp);
      for (const q of qs) {
        expect(typeof q).toBe("string");
        expect(q.length).toBeGreaterThan(5);
      }
    }
  });

  it("Nebim V3 questions are retail-flavored", () => {
    const qs = erpSuggestedQuestions("nebim_v3");
    const joined = qs.join(" ").toLowerCase();
    expect(joined).toMatch(/satış|stok|ürün/);
  });

  it("Dynamics 365 questions cover customer/finance", () => {
    const qs = erpSuggestedQuestions("dynamics365");
    const joined = qs.join(" ").toLowerCase();
    expect(joined).toMatch(/fatura|sipariş|müşteri|alacak/);
  });

  it("SAP questions cover manufacturing/finance", () => {
    const qs = erpSuggestedQuestions("sap");
    const joined = qs.join(" ").toLowerCase();
    expect(joined).toMatch(/üretim|kâr|stok değer|satınalma/);
  });

  it("Postgres questions are generic (custom app)", () => {
    const qs = erpSuggestedQuestions("postgres");
    const joined = qs.join(" ").toLowerCase();
    expect(joined).toMatch(/kullanıcı|kayıt|transaction|tablo/);
  });

  it("null erpType falls back to Nebim (TR retail default)", () => {
    const qs = erpSuggestedQuestions(null);
    const nebim = erpSuggestedQuestions("nebim_v3");
    expect(qs).toEqual(nebim);
  });

  it("undefined erpType falls back to Nebim", () => {
    const qs = erpSuggestedQuestions(undefined);
    const nebim = erpSuggestedQuestions("nebim_v3");
    expect(qs).toEqual(nebim);
  });

  it("returns readonly tuple (compile-time)", () => {
    const qs = erpSuggestedQuestions("nebim_v3");
    // TS: cannot push to readonly tuple
    // @ts-expect-error readonly check
    qs.push("x");
    // Runtime still works (TS-only protection); just verify type contract.
    expect(qs.length).toBeGreaterThanOrEqual(4);
  });

  it("ERP-specific sets are NOT identical to each other (real differentiation)", () => {
    const nebim = erpSuggestedQuestions("nebim_v3");
    const d365 = erpSuggestedQuestions("dynamics365");
    const sap = erpSuggestedQuestions("sap");
    const pg = erpSuggestedQuestions("postgres");
    expect(nebim).not.toEqual(d365);
    expect(d365).not.toEqual(sap);
    expect(sap).not.toEqual(pg);
  });
});
