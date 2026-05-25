import { describe, it, expect } from "vitest";
import { escapeHtml } from "./escape";

describe("html/escape/escapeHtml (XSS boundary — single source of truth)", () => {
  describe("each of the 5 escapable chars", () => {
    it("ampersand → &amp;", () => {
      expect(escapeHtml("&")).toBe("&amp;");
    });
    it("less-than → &lt;", () => {
      expect(escapeHtml("<")).toBe("&lt;");
    });
    it("greater-than → &gt;", () => {
      expect(escapeHtml(">")).toBe("&gt;");
    });
    it("double quote → &quot;", () => {
      expect(escapeHtml('"')).toBe("&quot;");
    });
    it("single quote → &#39;", () => {
      expect(escapeHtml("'")).toBe("&#39;");
    });
  });

  describe("ordering invariant (regression guard)", () => {
    it("escaping `<` produces `&lt;` not `&amp;lt;` (no double-encode)", () => {
      // If '<' were escaped before '&', "<" → "&lt;" then "&" → "&amp;lt;"
      // — verify we don't see the broken double-encoding.
      expect(escapeHtml("<")).toBe("&lt;");
      expect(escapeHtml("<")).not.toContain("&amp;lt;");
    });

    it("`&` and `<` together preserve correct order", () => {
      expect(escapeHtml("&<")).toBe("&amp;&lt;");
    });
  });

  describe("common attack vectors neutralized", () => {
    it("<script> tag", () => {
      expect(escapeHtml("<script>alert(1)</script>")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });
    it("event handler with single quote", () => {
      expect(escapeHtml("' onclick='evil()'")).toBe(
        "&#39; onclick=&#39;evil()&#39;",
      );
    });
    it("javascript: pseudo-protocol (chars only — protocol itself untouched)", () => {
      expect(escapeHtml('javascript:alert("x")')).toBe(
        "javascript:alert(&quot;x&quot;)",
      );
    });
    it("img onerror payload", () => {
      expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
      );
    });
  });

  describe("preserves safe content", () => {
    it("plain ASCII text untouched", () => {
      expect(escapeHtml("Hello world")).toBe("Hello world");
    });
    it("unicode (Turkish) untouched", () => {
      expect(escapeHtml("Şirket adı: Tüm-Müzik")).toBe("Şirket adı: Tüm-Müzik");
    });
    it("digits and punctuation (non-attack) untouched", () => {
      expect(escapeHtml("Order #1234 — total $99.50")).toBe("Order #1234 — total $99.50");
    });
    it("empty string → empty string", () => {
      expect(escapeHtml("")).toBe("");
    });
  });

  describe("multiple occurrences", () => {
    it("escapes all instances, not just first", () => {
      expect(escapeHtml("a < b & c < d")).toBe("a &lt; b &amp; c &lt; d");
    });

    it("repeated ampersands", () => {
      expect(escapeHtml("&&&")).toBe("&amp;&amp;&amp;");
    });
  });

  describe("idempotency-like behavior (double-escape)", () => {
    it("escaping already-escaped output produces further escapes (expected)", () => {
      // Document behavior: escapeHtml is NOT idempotent.
      // If you double-call, you get "&amp;amp;" — caller responsibility to
      // apply only once at the boundary.
      expect(escapeHtml(escapeHtml("&"))).toBe("&amp;amp;");
    });
  });
});
