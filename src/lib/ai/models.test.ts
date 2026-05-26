import { describe, it, expect } from "vitest";
import { MODEL_SONNET, MODEL_HAIKU } from "./models";

describe("ai/models constants", () => {
  it("MODEL_SONNET is the canonical Sonnet ID", () => {
    expect(MODEL_SONNET).toBe("claude-sonnet-4-5");
  });

  it("MODEL_HAIKU is the canonical Haiku ID", () => {
    expect(MODEL_HAIKU).toBe("claude-haiku-4-5");
  });

  it("model IDs are distinct (sanity)", () => {
    expect(MODEL_SONNET).not.toBe(MODEL_HAIKU);
  });

  it("both start with `claude-` prefix (Anthropic naming convention)", () => {
    expect(MODEL_SONNET.startsWith("claude-")).toBe(true);
    expect(MODEL_HAIKU.startsWith("claude-")).toBe(true);
  });
});
