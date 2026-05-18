import { describe, it, expect } from "vitest";
import { annotationsToPromptContext, type AnnotationLookup } from "./annotations";

describe("cache/annotations/annotationsToPromptContext", () => {
  it("empty lookup → empty string (no header injected)", () => {
    const empty: AnnotationLookup = { tables: {}, columns: {} };
    expect(annotationsToPromptContext(empty)).toBe("");
  });

  it("only tables — adds header + table descriptions", () => {
    const lookup: AnnotationLookup = {
      tables: {
        Users: { description: "Kullanıcı tablosu", hidden: false },
        Orders: { description: "Siparişler", hidden: false },
      },
      columns: {},
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).toContain("MÜŞTERİ ÖZGÜ ANNOTATIONS");
    expect(ctx).toContain("- Users: Kullanıcı tablosu");
    expect(ctx).toContain("- Orders: Siparişler");
  });

  it("hidden table → '❌ KULLANMA' marker (admin explicit block)", () => {
    const lookup: AnnotationLookup = {
      tables: { OldLegacy: { hidden: true } },
      columns: {},
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).toContain("- OldLegacy: ❌ KULLANMA (admin gizledi)");
  });

  it("hidden takes precedence over description", () => {
    const lookup: AnnotationLookup = {
      tables: { T: { description: "Eski açıklama", hidden: true } },
      columns: {},
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).toContain("❌ KULLANMA");
    expect(ctx).not.toContain("Eski açıklama");
  });

  it("table without description and not hidden → skipped (no noise)", () => {
    const lookup: AnnotationLookup = {
      tables: { Empty: { hidden: false } },
      columns: {},
    };
    const ctx = annotationsToPromptContext(lookup);
    // Header injected but no useful line for "Empty"
    expect(ctx).toContain("MÜŞTERİ ÖZGÜ");
    expect(ctx).not.toContain("- Empty:");
  });

  it("columns with descriptions are listed", () => {
    const lookup: AnnotationLookup = {
      tables: {},
      columns: {
        "Users.email": { description: "Email PII; mask UI'da" },
        "Orders.tutar": { description: "Net tutar TL" },
      },
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).toContain("- Users.email: Email PII; mask UI'da");
    expect(ctx).toContain("- Orders.tutar: Net tutar TL");
  });

  it("columns without description → skipped", () => {
    const lookup: AnnotationLookup = {
      tables: {},
      columns: { "T.c": { description: undefined } },
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).not.toContain("- T.c:");
  });

  it("mixed table+column lookups — both render", () => {
    const lookup: AnnotationLookup = {
      tables: { T: { description: "tablo açıklaması", hidden: false } },
      columns: { "T.c": { description: "kolon açıklaması" } },
    };
    const ctx = annotationsToPromptContext(lookup);
    expect(ctx).toContain("- T: tablo açıklaması");
    expect(ctx).toContain("- T.c: kolon açıklaması");
  });
});
