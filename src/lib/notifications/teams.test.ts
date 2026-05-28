import { describe, it, expect } from "vitest";
import { buildTeamsBody } from "./teams";

describe("notifications/teams/buildTeamsBody", () => {
  it("returns MessageCard with required @type/@context", () => {
    const body = buildTeamsBody({ severity: "high", title: "x" });
    expect(body["@type"]).toBe("MessageCard");
    expect(body["@context"]).toBe("http://schema.org/extensions");
  });

  it("maps each known severity to themeColor (hex sans #)", () => {
    expect(buildTeamsBody({ severity: "critical", title: "x" }).themeColor).toBe("FF3B30");
    expect(buildTeamsBody({ severity: "high", title: "x" }).themeColor).toBe("FF9500");
    expect(buildTeamsBody({ severity: "medium", title: "x" }).themeColor).toBe("FFD740");
    expect(buildTeamsBody({ severity: "low", title: "x" }).themeColor).toBe("00E5FF");
  });

  it("unknown severity → neutral grey fallback", () => {
    expect(buildTeamsBody({ severity: "wat", title: "x" }).themeColor).toBe("9AA5B4");
  });

  it("TR default — summary line: [ERPAIO TR_SEV] title", () => {
    const body = buildTeamsBody({ severity: "critical", title: "DB unreachable" });
    expect(body.summary).toBe("[ERPAIO KRİTİK] DB unreachable");
  });

  it("TR default — title line: TR_SEV · title (with middle dot)", () => {
    const body = buildTeamsBody({ severity: "medium", title: "Stock low" });
    expect(body.title).toBe("ORTA · Stock low");
  });

  it("EN locale — keeps universal uppercase severity codes", () => {
    const body = buildTeamsBody({ severity: "high", title: "DB error", locale: "en" });
    expect(body.summary).toBe("[ERPAIO HIGH] DB error");
    expect(body.title).toBe("HIGH · DB error");
  });

  it("TR locale explicit — maps all 4 severities", () => {
    expect(buildTeamsBody({ severity: "critical", title: "x", locale: "tr" }).title).toBe("KRİTİK · x");
    expect(buildTeamsBody({ severity: "high", title: "x", locale: "tr" }).title).toBe("YÜKSEK · x");
    expect(buildTeamsBody({ severity: "medium", title: "x", locale: "tr" }).title).toBe("ORTA · x");
    expect(buildTeamsBody({ severity: "low", title: "x", locale: "tr" }).title).toBe("DÜŞÜK · x");
  });

  it("TR — unknown severity falls back to uppercase value", () => {
    const body = buildTeamsBody({ severity: "wat", title: "x" });
    expect(body.title).toBe("WAT · x");
  });

  it("description → text field", () => {
    const body = buildTeamsBody({ severity: "low", title: "x", description: "Detail" });
    expect(body.text).toBe("Detail");
  });

  it("description null/undefined → empty string", () => {
    expect(buildTeamsBody({ severity: "low", title: "x" }).text).toBe("");
    expect(buildTeamsBody({ severity: "low", title: "x", description: null }).text).toBe("");
  });

  it("EN — severity uppercased in both summary and title regardless of input case", () => {
    const body = buildTeamsBody({ severity: "high", title: "x", locale: "en" });
    expect(body.summary).toContain("HIGH");
    expect(body.title.startsWith("HIGH")).toBe(true);
  });
});
