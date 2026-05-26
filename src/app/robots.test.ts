import { describe, it, expect } from "vitest";
import robots from "./robots";

describe("app/robots", () => {
  const result = robots();

  it("returns 2 rule groups (general + AI crawlers)", () => {
    expect(Array.isArray(result.rules)).toBe(true);
    expect((result.rules as unknown[]).length).toBe(2);
  });

  it("first rule is for `*` user agent (general crawlers)", () => {
    const rules = result.rules as Array<{ userAgent: string | string[] }>;
    expect(rules[0].userAgent).toBe("*");
  });

  it("first rule allows landing + marketing pages", () => {
    const rules = result.rules as Array<{ allow: string[] }>;
    expect(rules[0].allow).toContain("/");
    expect(rules[0].allow).toContain("/pricing");
    expect(rules[0].allow).toContain("/help");
  });

  it("first rule disallows dashboard + admin + api (private routes)", () => {
    const rules = result.rules as Array<{ disallow: string[] }>;
    expect(rules[0].disallow).toContain("/api/");
    expect(rules[0].disallow).toContain("/dashboard/");
    expect(rules[0].disallow).toContain("/admin/");
  });

  it("first rule disallows auth pages (signup, login, etc.)", () => {
    const rules = result.rules as Array<{ disallow: string[] }>;
    expect(rules[0].disallow).toContain("/login");
    expect(rules[0].disallow).toContain("/signup");
    expect(rules[0].disallow).toContain("/forgot-password");
  });

  it("AI crawler rule lists GPTBot, Claude-Web, anthropic-ai etc.", () => {
    const rules = result.rules as Array<{ userAgent: string | string[] }>;
    const aiAgents = rules[1].userAgent as string[];
    expect(Array.isArray(aiAgents)).toBe(true);
    expect(aiAgents).toContain("GPTBot");
    expect(aiAgents).toContain("Claude-Web");
    expect(aiAgents).toContain("anthropic-ai");
  });

  it("AI crawler rule allows landing + marketing only", () => {
    const rules = result.rules as Array<{ allow: string[]; disallow: string[] }>;
    expect(rules[1].allow).toContain("/");
    expect(rules[1].disallow).toContain("/api/");
    expect(rules[1].disallow).toContain("/dashboard/");
  });

  it("sitemap URL points to /sitemap.xml at baseUrl", () => {
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
