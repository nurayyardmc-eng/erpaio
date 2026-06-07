import { describe, it, expect } from "vitest";
import {
  buildPushTokenWhere,
  chunkArray,
  EXPO_PUSH_BATCH_SIZE,
  PREF_COLUMN,
  PUSH_PREFS_SELECT,
  mapPushPrefsRow,
  buildPushPrefsUpdate,
} from "./push";

describe("notifications/push", () => {
  describe("chunkArray", () => {
    it("empty array → empty result", () => {
      expect(chunkArray([], 10)).toEqual([]);
    });

    it("single chunk when items fit", () => {
      expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });

    it("splits into multiple chunks", () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("exact multiple → no trailing partial", () => {
      expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("works with size 1", () => {
      expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it("throws on zero size", () => {
      expect(() => chunkArray([1], 0)).toThrow();
    });

    it("throws on negative size", () => {
      expect(() => chunkArray([1], -1)).toThrow();
    });

    it("preserves order across chunks", () => {
      const input = Array.from({ length: 250 }, (_, i) => i);
      const chunks = chunkArray(input, 100);
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(100);
      expect(chunks[2]).toHaveLength(50);
      // Flatten and compare
      expect(chunks.flat()).toEqual(input);
    });

    it("works for objects (token payloads)", () => {
      const tokens = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const chunks = chunkArray(tokens, 2);
      expect(chunks).toEqual([[{ id: "a" }, { id: "b" }], [{ id: "c" }]]);
    });
  });

  describe("buildPushTokenWhere — per-user pref filter", () => {
    it("no category → legacy where (tenantId only, no user join)", () => {
      const w = buildPushTokenWhere("t_1");
      expect(w).toEqual({ tenantId: "t_1" });
      expect("user" in w).toBe(false);
    });

    it("alerts category → joins User with pushPrefAlerts:true", () => {
      const w = buildPushTokenWhere("t_1", "alerts");
      expect(w).toEqual({ tenantId: "t_1", user: { pushPrefAlerts: true } });
    });

    it("anomaly category → joins User with pushPrefAnomaly:true", () => {
      const w = buildPushTokenWhere("t_1", "anomaly");
      expect(w).toEqual({ tenantId: "t_1", user: { pushPrefAnomaly: true } });
    });

    it("watchlists category → joins User with pushPrefWatchlists:true", () => {
      const w = buildPushTokenWhere("t_1", "watchlists");
      expect(w).toEqual({ tenantId: "t_1", user: { pushPrefWatchlists: true } });
    });

    it("PREF_COLUMN covers every PushCategory key — typos surface here", () => {
      // PREF_COLUMN'a yeni kategori eklemeden union'a yeni değer eklenirse
      // bu test TypeScript'te yakalar (Record<PushCategory,...> exhaustive).
      // Runtime'da da 3 anahtarı doğrula:
      expect(Object.keys(PREF_COLUMN).sort()).toEqual(["alerts", "anomaly", "watchlists"]);
    });
  });

  describe("PUSH_PREFS_SELECT — single-source Prisma select", () => {
    it("selects exactly the three pref columns from PREF_COLUMN", () => {
      expect(Object.keys(PUSH_PREFS_SELECT).sort()).toEqual(
        Object.values(PREF_COLUMN).sort(),
      );
    });

    it("every column flagged true", () => {
      expect(Object.values(PUSH_PREFS_SELECT).every((v) => v === true)).toBe(true);
    });
  });

  describe("mapPushPrefsRow — column row → API shape", () => {
    it("maps each column to its category key", () => {
      expect(
        mapPushPrefsRow({
          pushPrefAlerts: true,
          pushPrefAnomaly: false,
          pushPrefWatchlists: true,
        }),
      ).toEqual({ alerts: true, anomaly: false, watchlists: true });
    });

    it("all-false row → all-false prefs", () => {
      expect(
        mapPushPrefsRow({
          pushPrefAlerts: false,
          pushPrefAnomaly: false,
          pushPrefWatchlists: false,
        }),
      ).toEqual({ alerts: false, anomaly: false, watchlists: false });
    });
  });

  describe("buildPushPrefsUpdate — PATCH body → Prisma data", () => {
    it("empty body → {} (no-op PATCH)", () => {
      expect(buildPushPrefsUpdate({})).toEqual({});
    });

    it("single field → single column written", () => {
      expect(buildPushPrefsUpdate({ anomaly: false })).toEqual({
        pushPrefAnomaly: false,
      });
    });

    it("all fields → all columns written", () => {
      expect(
        buildPushPrefsUpdate({ alerts: true, anomaly: false, watchlists: true }),
      ).toEqual({
        pushPrefAlerts: true,
        pushPrefAnomaly: false,
        pushPrefWatchlists: true,
      });
    });

    it("false is written (distinct from undefined/omitted)", () => {
      const out = buildPushPrefsUpdate({ alerts: false });
      expect(out).toEqual({ pushPrefAlerts: false });
      expect("pushPrefAnomaly" in out).toBe(false);
    });

    it("explicit undefined is skipped (not written as undefined)", () => {
      const out = buildPushPrefsUpdate({ alerts: true, anomaly: undefined });
      expect(out).toEqual({ pushPrefAlerts: true });
      expect("pushPrefAnomaly" in out).toBe(false);
    });
  });

  describe("EXPO_PUSH_BATCH_SIZE", () => {
    it("is 100 (Expo API documented limit)", () => {
      expect(EXPO_PUSH_BATCH_SIZE).toBe(100);
    });

    it("250 tokens → 3 batches", () => {
      const tokens = Array.from({ length: 250 }, (_, i) => `t${i}`);
      const chunks = chunkArray(tokens, EXPO_PUSH_BATCH_SIZE);
      expect(chunks.length).toBe(3);
    });

    it("100 tokens → exactly 1 batch (not 2 with empty trailing)", () => {
      const tokens = Array.from({ length: 100 }, (_, i) => `t${i}`);
      expect(chunkArray(tokens, EXPO_PUSH_BATCH_SIZE).length).toBe(1);
    });
  });
});
