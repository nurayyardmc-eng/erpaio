import { describe, it, expect } from "vitest";
import { isNavActive } from "./active";

describe("nav/active/isNavActive", () => {
  it("exact match → true", () => {
    expect(isNavActive("/dashboard/chat", "/dashboard/chat")).toBe(true);
  });

  it("child route → true", () => {
    expect(isNavActive("/dashboard/chat/session-123", "/dashboard/chat")).toBe(true);
  });

  it("deeper child route → true", () => {
    expect(
      isNavActive("/dashboard/connections/erp/conn-1/edit", "/dashboard/connections"),
    ).toBe(true);
  });

  it("sibling page with similar prefix → false (regression marker)", () => {
    // "/dashboard/alertsfoo" is NOT a child of "/dashboard/alerts" — must
    // be /dashboard/alerts/<sub> or exact.
    expect(isNavActive("/dashboard/alertsfoo", "/dashboard/alerts")).toBe(false);
  });

  it("partial prefix without trailing slash → false", () => {
    expect(isNavActive("/dashboard/audi", "/dashboard/audit")).toBe(false);
    expect(isNavActive("/dashboard/audit-old", "/dashboard/audit")).toBe(false);
  });

  it("unrelated path → false", () => {
    expect(isNavActive("/login", "/dashboard/chat")).toBe(false);
    expect(isNavActive("/", "/dashboard/chat")).toBe(false);
  });

  it("href with trailing slash NOT canonical (caller responsibility)", () => {
    // Document current behavior: if href has trailing /, exact-equal still
    // works but child check needs another /.
    expect(isNavActive("/dashboard/chat/", "/dashboard/chat/")).toBe(true);
  });

  it("root pathname '/' does not match any nested href", () => {
    expect(isNavActive("/", "/dashboard")).toBe(false);
  });

  it("query params are NOT part of pathname (caller strips beforehand)", () => {
    // usePathname() in Next.js returns without query string already.
    expect(isNavActive("/dashboard/audit", "/dashboard/audit")).toBe(true);
  });

  it("case-sensitive", () => {
    expect(isNavActive("/Dashboard/Chat", "/dashboard/chat")).toBe(false);
  });
});
