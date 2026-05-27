import { describe, it, expect } from "vitest";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from "./types";

describe("notifications/types constants", () => {
  describe("NOTIFICATION_CHANNELS", () => {
    it("contains all 6 supported channels", () => {
      expect(NOTIFICATION_CHANNELS).toEqual([
        "whatsapp",
        "email",
        "push",
        "slack",
        "teams",
        "webhook",
      ]);
    });

    it("includes core push notification channels", () => {
      expect(NOTIFICATION_CHANNELS).toContain("whatsapp");
      expect(NOTIFICATION_CHANNELS).toContain("email");
      expect(NOTIFICATION_CHANNELS).toContain("push");
    });

    it("includes integration channels", () => {
      expect(NOTIFICATION_CHANNELS).toContain("slack");
      expect(NOTIFICATION_CHANNELS).toContain("teams");
      expect(NOTIFICATION_CHANNELS).toContain("webhook");
    });

    it("no duplicates", () => {
      const unique = new Set(NOTIFICATION_CHANNELS);
      expect(unique.size).toBe(NOTIFICATION_CHANNELS.length);
    });
  });

  describe("NOTIFICATION_STATUSES", () => {
    it("has exactly 3 statuses", () => {
      expect(NOTIFICATION_STATUSES).toEqual(["sent", "failed", "skipped"]);
    });

    it("includes 'sent' (success path)", () => {
      expect(NOTIFICATION_STATUSES).toContain("sent");
    });

    it("includes 'failed' (provider error)", () => {
      expect(NOTIFICATION_STATUSES).toContain("failed");
    });

    it("includes 'skipped' (provider unconfigured)", () => {
      expect(NOTIFICATION_STATUSES).toContain("skipped");
    });

    it("no duplicates", () => {
      const unique = new Set(NOTIFICATION_STATUSES);
      expect(unique.size).toBe(NOTIFICATION_STATUSES.length);
    });
  });
});
