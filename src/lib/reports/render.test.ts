import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escHtml,
  shouldFireSchedule,
  renderReportHtml,
  SCHEDULE_FILTER,
} from "./render";

describe("reports/render/escHtml (XSS boundary)", () => {
  it("escapes all 5 dangerous chars", () => {
    expect(escHtml("&")).toBe("&amp;");
    expect(escHtml("<")).toBe("&lt;");
    expect(escHtml(">")).toBe("&gt;");
    expect(escHtml('"')).toBe("&quot;");
    expect(escHtml("'")).toBe("&#39;");
  });

  it("neutralizes <script> injection", () => {
    expect(escHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("preserves safe chars unchanged", () => {
    expect(escHtml("Hello, world.")).toBe("Hello, world.");
    expect(escHtml("Şirket — Türkçe çağrı")).toBe("Şirket — Türkçe çağrı");
  });

  it("handles empty string", () => {
    expect(escHtml("")).toBe("");
  });

  it("ampersand-first ordering avoids double-encode", () => {
    // If '<' were escaped before '&', "<" → "&lt;" then "&" → "&amp;lt;" (bug).
    expect(escHtml("<")).toBe("&lt;");
  });
});

describe("reports/render/shouldFireSchedule", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hourly always fires", () => {
    vi.setSystemTime(new Date("2026-05-19T12:34:56Z"));
    expect(shouldFireSchedule("hourly")).toBe(true);
  });

  it("daily_06 fires only when UTC hour = 3 (06 TR)", () => {
    vi.setSystemTime(new Date("2026-05-19T03:00:00Z"));
    expect(shouldFireSchedule("daily_06")).toBe(true);
    vi.setSystemTime(new Date("2026-05-19T04:00:00Z"));
    expect(shouldFireSchedule("daily_06")).toBe(false);
  });

  it("daily_18 fires only when UTC hour = 15 (18 TR)", () => {
    vi.setSystemTime(new Date("2026-05-19T15:00:00Z"));
    expect(shouldFireSchedule("daily_18")).toBe(true);
    vi.setSystemTime(new Date("2026-05-19T16:00:00Z"));
    expect(shouldFireSchedule("daily_18")).toBe(false);
  });

  it("weekly_monday only Monday + UTC=3", () => {
    // 2026-05-18 is a Monday (UTC day=1).
    vi.setSystemTime(new Date("2026-05-18T03:00:00Z"));
    expect(shouldFireSchedule("weekly_monday")).toBe(true);
    // Same Monday but UTC=4 → no
    vi.setSystemTime(new Date("2026-05-18T04:00:00Z"));
    expect(shouldFireSchedule("weekly_monday")).toBe(false);
    // Tuesday UTC=3 → no
    vi.setSystemTime(new Date("2026-05-19T03:00:00Z"));
    expect(shouldFireSchedule("weekly_monday")).toBe(false);
  });

  it("monthly_first only on UTC day=1 + hour=3", () => {
    vi.setSystemTime(new Date("2026-05-01T03:00:00Z"));
    expect(shouldFireSchedule("monthly_first")).toBe(true);
    vi.setSystemTime(new Date("2026-05-02T03:00:00Z"));
    expect(shouldFireSchedule("monthly_first")).toBe(false);
    vi.setSystemTime(new Date("2026-05-01T04:00:00Z"));
    expect(shouldFireSchedule("monthly_first")).toBe(false);
  });

  it("unknown schedule → false (defensive)", () => {
    vi.setSystemTime(new Date("2026-05-19T03:00:00Z"));
    expect(shouldFireSchedule("yearly")).toBe(false);
    expect(shouldFireSchedule("")).toBe(false);
  });

  it("SCHEDULE_FILTER map has exactly 5 known schedules", () => {
    expect(Object.keys(SCHEDULE_FILTER).sort()).toEqual([
      "daily_06",
      "daily_18",
      "hourly",
      "monthly_first",
      "weekly_monday",
    ]);
  });
});

describe("reports/render/renderReportHtml", () => {
  it("empty rows → renders with 0 satır + no tbody rows", () => {
    const html = renderReportHtml("Aylık", "soru", "SELECT 1", []);
    expect(html).toContain("0 satır");
    expect(html).toContain("ERPAIO RAPOR");
  });

  it("escapes name, question, sql (XSS guard)", () => {
    const html = renderReportHtml(
      "<script>x</script>",
      "<img onerror=alert(1)>",
      "SELECT * FROM <t>",
      [],
    );
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img onerror=alert(1)&gt;");
    expect(html).toContain("SELECT * FROM &lt;t&gt;");
  });

  it("escapes cell values (XSS via DB content)", () => {
    const html = renderReportHtml("R", "q", "sql", [{ note: "<b>bold</b>" }]);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });

  it("column headers from first row keys", () => {
    const html = renderReportHtml("R", "q", "sql", [{ orderId: 1, total: 50 }]);
    expect(html).toContain(">orderId<");
    expect(html).toContain(">total<");
  });

  it("null/undefined cell values render empty string (not 'null' / 'undefined')", () => {
    const html = renderReportHtml("R", "q", "sql", [{ k: null }, { k: undefined }]);
    expect(html).not.toMatch(/>null</);
    expect(html).not.toMatch(/>undefined</);
  });

  it("truncates table body at 100 rows + shows footer", () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: i }));
    const html = renderReportHtml("R", "q", "sql", rows);
    expect(html).toContain("İlk 100 satır gösteriliyor (toplam 150)");
    // Count <tr> tags after the <thead>; should be 100 in tbody plus 1 in thead.
    const trCount = (html.match(/<tr/g) || []).length;
    expect(trCount).toBe(101);
  });

  it("≤ 100 rows → no truncation footer", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const html = renderReportHtml("R", "q", "sql", rows);
    expect(html).not.toContain("İlk 100 satır gösteriliyor");
  });

  it("alternating row colors (even=white, odd=grey)", () => {
    const html = renderReportHtml("R", "q", "sql", [{ k: "a" }, { k: "b" }]);
    expect(html).toMatch(/background:#FFFFFF/);
    expect(html).toMatch(/background:#F9FAFB/);
  });

  it("renders valid !doctype HTML", () => {
    const html = renderReportHtml("R", "q", "sql", []);
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("includes row count badge in SQL header", () => {
    const html = renderReportHtml("R", "q", "sql", [{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(html).toContain("SQL · 3 satır");
  });
});
