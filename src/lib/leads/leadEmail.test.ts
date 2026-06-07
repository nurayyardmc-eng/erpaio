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

  describe("general contact variant (no erp)", () => {
    const contact = {
      name: "Mehmet Demir",
      email: "mehmet@firma.com",
      company: "Demir A.Ş.",
      interest: "Kurumsal Entegrasyon",
      message: "5 mağazamız var, stok sorgusu istiyoruz.",
      locale: "tr" as const,
    };

    it("subject is 'New contact' (no ERP) when erp omitted", () => {
      expect(buildLeadEmail(contact).subject).toBe("New contact — Mehmet Demir");
    });

    it("badge + heading switch to CONTACT", () => {
      const { html, text } = buildLeadEmail(contact);
      expect(html).toContain("CONTACT");
      expect(html).not.toContain("DEMO REQUEST");
      expect(text).toContain("New contact message");
    });

    it("includes company / interest / message rows, omits ERP", () => {
      const { html, text } = buildLeadEmail(contact);
      for (const fragment of ["Demir A.Ş.", "Kurumsal Entegrasyon", "stok sorgusu"]) {
        expect(html).toContain(fragment);
        expect(text).toContain(fragment);
      }
      expect(text).not.toContain("ERP:");
    });

    it("escapes HTML in the free-text message (XSS guard)", () => {
      const { html } = buildLeadEmail({ ...contact, message: "<img src=x onerror=alert(1)>" });
      expect(html).not.toContain("<img src=x");
      expect(html).toContain("&lt;img");
    });

    it("omits optional rows that are not provided", () => {
      const { text } = buildLeadEmail({ name: "A B", email: "a@b.com" });
      expect(text).not.toContain("Company:");
      expect(text).not.toContain("Interest:");
      expect(text).not.toContain("Message:");
      expect(text).not.toContain("ERP:");
      expect(text).toContain("Locale: en");
    });
  });
});
