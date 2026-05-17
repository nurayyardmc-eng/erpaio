import { describe, expect, it } from "vitest";
import { routeFromNotificationData } from "./routing";

describe("notifications/routing", () => {
  describe("routeFromNotificationData", () => {
    it("null → null (no-op)", () => {
      expect(routeFromNotificationData(null)).toBeNull();
    });

    it("undefined → null", () => {
      expect(routeFromNotificationData(undefined)).toBeNull();
    });

    it("string primitive → null (not an object)", () => {
      expect(routeFromNotificationData("alertId=abc")).toBeNull();
    });

    it("empty object → null", () => {
      expect(routeFromNotificationData({})).toBeNull();
    });

    it("unknown shape → null", () => {
      expect(routeFromNotificationData({ foo: "bar" })).toBeNull();
    });

    it("alertId string → Bildirimler tab + alertId for AlertDetail deep-link", () => {
      const t = routeFromNotificationData({ alertId: "alt_123", severity: "high" });
      expect(t).toEqual({ tab: "Bildirimler", alertId: "alt_123" });
    });

    it("watchlistId string → Menü tab + Watchlists nested", () => {
      const t = routeFromNotificationData({ watchlistId: "wl_42" });
      expect(t).toEqual({ tab: "Menü", nestedRoute: "Watchlists" });
    });

    it("alertId takes precedence when both present (anomaly with linked alert wins)", () => {
      const t = routeFromNotificationData({ alertId: "alt_1", watchlistId: "wl_1" });
      expect(t).toEqual({ tab: "Bildirimler", alertId: "alt_1" });
    });

    it("alertId empty string → null (no false-positive routing)", () => {
      expect(routeFromNotificationData({ alertId: "" })).toBeNull();
    });

    it("alertId non-string (number) → null (typeguard rejects)", () => {
      expect(routeFromNotificationData({ alertId: 42 })).toBeNull();
    });

    it("watchlistId empty string → null", () => {
      expect(routeFromNotificationData({ watchlistId: "" })).toBeNull();
    });
  });
});
