import { describe, it, expect } from "vitest";
import { transactionalEmailHtml } from "./emailLayout";

describe("notifications/emailLayout/transactionalEmailHtml", () => {
  it("renders all four fields verbatim into template", () => {
    const html = transactionalEmailHtml(
      "Hoş geldiniz",
      "Hesabınız aktif.",
      "Devam et",
      "https://erpaio.test/dashboard",
    );
    expect(html).toContain(">Hoş geldiniz<");
    expect(html).toContain(">Hesabınız aktif.<");
    expect(html).toContain(">Devam et<");
    expect(html).toContain("https://erpaio.test/dashboard");
  });

  it("includes brand wordmark 'ERPAIO'", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html).toContain(">ERPAIO<");
  });

  it("starts with <!doctype html> (deliverability)", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html.trimStart().startsWith("<!doctype html>")).toBe(true);
  });

  it("uses inline styles only — no <style> block (email client safe)", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html).not.toMatch(/<style[\s>]/i);
  });

  it("CTA link points to provided URL", () => {
    const html = transactionalEmailHtml("t", "b", "Buton", "https://example.com/page?ref=abc");
    expect(html).toContain('href="https://example.com/page?ref=abc"');
  });

  it("CTA color is brand black (#0A0A0A)", () => {
    const html = transactionalEmailHtml("t", "b", "Buton", "/");
    expect(html).toMatch(/background:#0A0A0A/);
  });

  it("body color is brand muted grey (#475569)", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html).toMatch(/color:#475569/);
  });

  it("page background warm grey (#F9FAFB) — design tokens contract", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html).toMatch(/background:#F9FAFB/);
  });

  it("inserts content WITHOUT escaping (caller responsibility)", () => {
    // Documented behavior: trusted callers only.
    const html = transactionalEmailHtml("<b>Bold</b>", "x", "x", "/");
    expect(html).toContain("<b>Bold</b>");
  });

  it("supports unicode (Turkish chars preserved)", () => {
    const html = transactionalEmailHtml(
      "Pro denemenize hoş geldiniz",
      "Aktif özelliklerle çalışın.",
      "Başla",
      "/",
    );
    expect(html).toContain("Pro denemenize hoş geldiniz");
    expect(html).toContain("özelliklerle çalışın");
  });

  it("includes brand letter-spacing on wordmark (regression guard)", () => {
    const html = transactionalEmailHtml("t", "b", "c", "/");
    expect(html).toMatch(/letter-spacing:3px/);
  });

  it("output is non-empty for any input", () => {
    expect(transactionalEmailHtml("", "", "", "")).not.toBe("");
    expect(transactionalEmailHtml("t", "b", "c", "/").length).toBeGreaterThan(500);
  });
});
