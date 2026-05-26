import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";

describe("app/sitemap", () => {
  const entries = sitemap();

  it("returns array of URL entries", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(8);
  });

  it("landing page is first + highest priority", () => {
    expect(entries[0].priority).toBe(1.0);
  });

  it("every entry has url, lastModified, changeFrequency, priority", () => {
    for (const e of entries) {
      expect(typeof e.url).toBe("string");
      expect(e.url.length).toBeGreaterThan(0);
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(typeof e.changeFrequency).toBe("string");
      expect(typeof e.priority).toBe("number");
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1.0);
    }
  });

  it("includes marketing pages (pricing, about, help, docs, changelog)", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/pricing"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/help"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/docs"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/changelog"))).toBe(true);
  });

  it("includes legal pages (privacy + terms) with low priority", () => {
    const privacy = entries.find((e) => e.url.endsWith("/privacy"));
    const terms = entries.find((e) => e.url.endsWith("/terms"));
    expect(privacy?.priority).toBeLessThanOrEqual(0.5);
    expect(terms?.priority).toBeLessThanOrEqual(0.5);
  });

  it("does NOT include private routes (dashboard, admin, login)", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/login"))).toBe(false);
  });

  it("status page exists with daily change frequency", () => {
    const status = entries.find((e) => e.url.endsWith("/status"));
    expect(status?.changeFrequency).toBe("daily");
  });
});
