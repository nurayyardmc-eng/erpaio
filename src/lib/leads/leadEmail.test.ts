import { describe, it, expect } from "vitest";
import { buildLeadEmail, erpLabel } from "./leadEmail";

describe("lib/leads/leadEmail/erpLabel", () => {
  it("maps each ERP enum to a display label", () => {
    expect(erpLabel("nebim")).toBe("Nebim V3");
    expect(erpLabel("sap")).toBe("SAP S/4HANA");
    expect(erpLabel("oracle")).toBe("Oracle Fusion");
    expect(erpLabel("dynamics")).toBe("Dynamics 365");
    expect(erpLabel("logo")).toBe("Logo");
    expect(erpLabel("mikro")).toBe("Mikro");
    expect(erpLabel("other")).toBe("Other / Diğer");
  });
});

describe("lib/leads/leadEmail/buildLeadEmail", () => {
  const base = { name: "Ayşe Yılmaz", email: "ayse@firma.com", erp: "nebim" as const };

  it("subject includes name + ERP label", () => {
    const { subject } = buildLeadEmail(base);
    expect(subject).toBe("New demo request — Ayşe Yılmaz (Nebim V3)");
  });

  it("html + text contain all field values", () => {
    const { html, text } = buildLeadEmail({ ...base, locale: "tr" });
    for (const fragment of ["Ayşe Yılmaz", "ayse@firma.com", "Nebim V3", "tr"]) {
      expect(html).toContain(fragment);
      expect(text).toContain(fragment);
    }
  });

  it("defaults locale to en when omitted", () => {
    const { text } = buildLeadEmail(base);
    expect(text).toContain("Locale: en");
  });

  it("escapes HTML in user-supplied name (XSS guard)", () => {
    const { html } = buildLeadEmail({ ...base, name: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in email field too", () => {
    const { html } = buildLeadEmail({ ...base, email: "a@b.com<img src=x>" });
    expect(html).not.toContain("<img src=x>");
  });

  it("text body is newline-delimited key: value pairs", () => {
    const { text } = buildLeadEmail(base);
    expect(text).toContain("Name: Ayşe Yılmaz");
    expect(text).toContain("Email: ayse@firma.com");
    expect(text).toContain("ERP: Nebim V3");
  });

  it("produces a full HTML document", () => {
    const { html } = buildLeadEmail(base);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("DEMO REQUEST");
  });
});
