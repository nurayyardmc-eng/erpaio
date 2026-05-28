import { describe, it, expect } from "vitest";
import { buildSlackBody } from "./slack";

describe("notifications/slack/buildSlackBody", () => {
  it("returns Block Kit attachment with severity color", () => {
    const body = buildSlackBody({ severity: "critical", title: "DB down" });
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].color).toBe("#FF3B30");
  });

  it("maps each known severity to its color", () => {
    expect(buildSlackBody({ severity: "critical", title: "x" }).attachments[0].color).toBe("#FF3B30");
    expect(buildSlackBody({ severity: "high", title: "x" }).attachments[0].color).toBe("#FF9500");
    expect(buildSlackBody({ severity: "medium", title: "x" }).attachments[0].color).toBe("#FFD740");
    expect(buildSlackBody({ severity: "low", title: "x" }).attachments[0].color).toBe("#00E5FF");
  });

  it("unknown severity → neutral grey fallback color", () => {
    expect(buildSlackBody({ severity: "wat", title: "x" }).attachments[0].color).toBe("#9AA5B4");
  });

  it("fallback text uppercases severity and prefixes [ERPAIO]", () => {
    const body = buildSlackBody({ severity: "high", title: "Order anomaly" });
    expect(body.attachments[0].fallback).toBe("[ERPAIO HIGH] Order anomaly");
  });

  it("header block includes severity emoji + title", () => {
    const body = buildSlackBody({ severity: "critical", title: "Stock zero" });
    const header = body.attachments[0].blocks[0] as { type: string; text: { text: string } };
    expect(header.type).toBe("header");
    expect(header.text.text).toBe("🔴 Stock zero");
  });

  it("each severity emoji distinct", () => {
    const emojiFor = (sev: string) => {
      const body = buildSlackBody({ severity: sev, title: "x" });
      const header = body.attachments[0].blocks[0] as { text: { text: string } };
      return header.text.text.split(" ")[0];
    };
    expect(emojiFor("critical")).toBe("🔴");
    expect(emojiFor("high")).toBe("🟠");
    expect(emojiFor("medium")).toBe("🟡");
    expect(emojiFor("low")).toBe("🔵");
    expect(emojiFor("unknown")).toBe("⚪");
  });

  it("description present → adds mrkdwn section block", () => {
    const body = buildSlackBody({
      severity: "medium",
      title: "x",
      description: "Detail here",
    });
    const blocks = body.attachments[0].blocks;
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatchObject({
      type: "section",
      text: { type: "mrkdwn", text: "Detail here" },
    });
  });

  it("description null/undefined → skips section block (header + context only)", () => {
    expect(buildSlackBody({ severity: "low", title: "x" }).attachments[0].blocks).toHaveLength(2);
    expect(buildSlackBody({ severity: "low", title: "x", description: null }).attachments[0].blocks).toHaveLength(2);
  });

  it("context block always present and uppercases severity (TR default)", () => {
    const body = buildSlackBody({ severity: "medium", title: "x" });
    const ctx = body.attachments[0].blocks.find((b) => (b as { type: string }).type === "context");
    expect(ctx).toBeDefined();
    const elements = (ctx as { elements: Array<{ text: string }> }).elements;
    expect(elements[0].text).toBe("*Önem:* MEDIUM");
    expect(elements[1].text).toBe("*Kaynak:* ERPAIO");
  });

  it("context block uses EN labels when locale=en (Feature 8.1)", () => {
    const body = buildSlackBody({ severity: "high", title: "x", locale: "en" });
    const ctx = body.attachments[0].blocks.find((b) => (b as { type: string }).type === "context");
    const elements = (ctx as { elements: Array<{ text: string }> }).elements;
    expect(elements[0].text).toBe("*Severity:* HIGH");
    expect(elements[1].text).toBe("*Source:* ERPAIO");
  });

  it("empty title still produces valid structure", () => {
    const body = buildSlackBody({ severity: "low", title: "" });
    expect(body.attachments[0].fallback).toBe("[ERPAIO LOW] ");
  });
});
