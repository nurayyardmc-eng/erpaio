import { describe, it, expect } from "vitest";
import { formatAlert, shouldNotify, sendWhatsApp } from "./whatsapp";

describe("notifications/whatsapp", () => {
  describe("formatAlert", () => {
    it("formats critical alert with red emoji", () => {
      const out = formatAlert({
        severity: "critical",
        title: "DB connection lost",
        description: "Master replica unreachable",
      });
      expect(out).toContain("🔴");
      expect(out).toContain("*ERPAIO Alert*");
      expect(out).toContain("*DB connection lost*");
      expect(out).toContain("Master replica unreachable");
    });

    it("uses default emoji for unknown severity", () => {
      const out = formatAlert({ severity: "bogus", title: "x" });
      expect(out).toContain("⚪");
    });

    it("handles null description", () => {
      const out = formatAlert({ severity: "high", title: "X", description: null });
      expect(out).toContain("🟠");
      expect(out).toContain("*X*");
    });

    it("severity mapping is complete", () => {
      expect(formatAlert({ severity: "critical", title: "x" })).toContain("🔴");
      expect(formatAlert({ severity: "high", title: "x" })).toContain("🟠");
      expect(formatAlert({ severity: "medium", title: "x" })).toContain("🟡");
      expect(formatAlert({ severity: "low", title: "x" })).toContain("🔵");
    });
  });

  describe("shouldNotify", () => {
    it("equal severity → true", () => {
      expect(shouldNotify("high", "high")).toBe(true);
    });

    it("higher severity → true", () => {
      expect(shouldNotify("critical", "high")).toBe(true);
      expect(shouldNotify("high", "medium")).toBe(true);
      expect(shouldNotify("medium", "low")).toBe(true);
    });

    it("lower severity → false", () => {
      expect(shouldNotify("low", "high")).toBe(false);
      expect(shouldNotify("medium", "critical")).toBe(false);
    });

    it("unknown alert severity (rank 0) → false unless minSeverity is also unknown", () => {
      expect(shouldNotify("bogus", "high")).toBe(false);
    });

    it("unknown minSeverity is treated as 4 (critical) → strict", () => {
      // Per implementation: minSeverity unknown defaults to rank 4
      expect(shouldNotify("high", "bogus")).toBe(false);
      expect(shouldNotify("critical", "bogus")).toBe(true);
    });
  });

  describe("sendWhatsApp without credentials", () => {
    it("returns {ok: false} instead of throwing", async () => {
      // Setup file forces TWILIO_* to "" — client is null
      const res = await sendWhatsApp("test", { to: "+905551234567" });
      expect(res.ok).toBe(false);
    });

    it("returns {ok: false} when no recipient configured", async () => {
      const res = await sendWhatsApp("test");
      expect(res.ok).toBe(false);
    });
  });
});
