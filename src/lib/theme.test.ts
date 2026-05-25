import { describe, it, expect } from "vitest";
import { colors, radius, shadow, font } from "./theme";

/**
 * Design-system regression guard (Track MMMMM).
 *
 * Component code references these tokens by named key, but many places in
 * the codebase ALSO hardcode the literal values (#0A0A0A, #FAFAF8, etc.)
 * for backwards-compat with email templates and external HTML. If a token
 * changes here without sweeping the literal callsites, we'd get a partial
 * theme inconsistency — these tests freeze the canonical values.
 */
describe("theme/colors brand tokens (canonical values)", () => {
  it("warm-white background = #FAFAF8 (NOT pure white)", () => {
    expect(colors.bg).toBe("#FAFAF8");
  });

  it("brand black = #0A0A0A (NOT pure black)", () => {
    expect(colors.brand).toBe("#0A0A0A");
    expect(colors.text).toBe("#0A0A0A");
    expect(colors.bgDark).toBe("#0A0A0A");
  });

  it("card surface = pure white #FFFFFF", () => {
    expect(colors.card).toBe("#FFFFFF");
  });

  it("accent purple = #9C8AFF", () => {
    expect(colors.accent).toBe("#9C8AFF");
  });
});

describe("theme/colors semantic tokens", () => {
  it("status colors use Tailwind palette", () => {
    expect(colors.success).toBe("#10B981"); // emerald-500
    expect(colors.warning).toBe("#F59E0B"); // amber-500
    expect(colors.error).toBe("#EF4444");   // red-500
    expect(colors.info).toBe("#3B82F6");    // blue-500
  });

  it("each status has a 'soft' counterpart for backgrounds", () => {
    expect(colors.successSoft).toBe("#D1FAE5");
    expect(colors.warningSoft).toBe("#FEF3C7");
    expect(colors.errorSoft).toBe("#FEE2E2");
    expect(colors.infoSoft).toBe("#DBEAFE");
    expect(colors.accentSoft).toBe("#EDE9FE");
  });
});

describe("theme/colors structural invariants", () => {
  it("all color values are valid CSS color strings (# or rgba)", () => {
    for (const [key, val] of Object.entries(colors)) {
      const ok = /^#[0-9A-Fa-f]{6}$/.test(val) || val.startsWith("rgba(");
      expect(ok, `${key} = ${val}`).toBe(true);
    }
  });

  it("hairline borders use rgba opacity (not solid hex)", () => {
    expect(colors.border).toMatch(/^rgba\(/);
    expect(colors.borderStrong).toMatch(/^rgba\(/);
    expect(colors.borderSubtle).toMatch(/^rgba\(/);
  });

  it("border opacity ordering: subtle < default < strong", () => {
    // 0.04 < 0.08 < 0.12
    const op = (s: string) => parseFloat(s.match(/[\d.]+\)/)?.[0] ?? "0");
    expect(op(colors.borderSubtle)).toBeLessThan(op(colors.border));
    expect(op(colors.border)).toBeLessThan(op(colors.borderStrong));
  });

  it("muted text contrast hierarchy: text > textMuted > textSubtle (luminance order)", () => {
    // Compare hex luma — text is darkest, then muted, then subtle.
    const luma = (hex: string): number => {
      const m = hex.match(/^#(..)(..)(..)/);
      if (!m) return 0;
      const r = parseInt(m[1], 16);
      const g = parseInt(m[2], 16);
      const b = parseInt(m[3], 16);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    expect(luma(colors.text)).toBeLessThan(luma(colors.textMuted));
    expect(luma(colors.textMuted)).toBeLessThan(luma(colors.textSubtle));
  });
});

describe("theme/radius", () => {
  it("ordering: sm < md < lg < xl < full", () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
    expect(radius.xl).toBeLessThan(radius.full);
  });

  it("'full' is effectively pill (>= 9999)", () => {
    expect(radius.full).toBeGreaterThanOrEqual(9999);
  });

  it("all values are non-negative integers", () => {
    for (const [, v] of Object.entries(radius)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("theme/shadow", () => {
  it("all shadow levels are non-empty CSS box-shadow strings", () => {
    expect(shadow.sm.length).toBeGreaterThan(10);
    expect(shadow.md.length).toBeGreaterThan(10);
    expect(shadow.lg.length).toBeGreaterThan(10);
  });

  it("each level contains '0 ' offset prefix (regression guard)", () => {
    expect(shadow.sm).toMatch(/0 \dpx/);
    expect(shadow.md).toMatch(/0 \dpx/);
    expect(shadow.lg).toMatch(/0 \d+px/);
  });
});

describe("theme/font", () => {
  it("uses Inter CSS variable as primary", () => {
    expect(font.family).toContain("var(--font-inter)");
  });

  it("includes Apple system font fallback (-apple-system)", () => {
    expect(font.family).toContain("-apple-system");
  });

  it("includes BlinkMacSystemFont (Safari/macOS)", () => {
    expect(font.family).toContain("BlinkMacSystemFont");
  });

  it("falls back to sans-serif at the end", () => {
    expect(font.family.endsWith("sans-serif")).toBe(true);
  });
});
