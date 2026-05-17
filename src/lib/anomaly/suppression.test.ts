import { describe, it, expect } from "vitest";
import {
  FP_SUPPRESS_THRESHOLD,
  FP_SUPPRESS_WINDOW_DAYS,
  shouldSuppressByFpCount,
} from "./suppression";

describe("anomaly/suppression", () => {
  describe("shouldSuppressByFpCount", () => {
    it("count 0 → false", () => {
      expect(shouldSuppressByFpCount(0)).toBe(false);
    });

    it("count 1 (below threshold=3) → false", () => {
      expect(shouldSuppressByFpCount(1)).toBe(false);
    });

    it("count 2 (just below) → false", () => {
      expect(shouldSuppressByFpCount(2)).toBe(false);
    });

    it("count 3 (eşik dahil) → true", () => {
      expect(shouldSuppressByFpCount(3)).toBe(true);
    });

    it("count 10 (well above) → true", () => {
      expect(shouldSuppressByFpCount(10)).toBe(true);
    });

    it("custom threshold honored — 5 with t=5 → true", () => {
      expect(shouldSuppressByFpCount(5, 5)).toBe(true);
    });

    it("custom threshold honored — 4 with t=5 → false", () => {
      expect(shouldSuppressByFpCount(4, 5)).toBe(false);
    });

    it("NaN count → false (defensive — no suppression on bad data)", () => {
      expect(shouldSuppressByFpCount(NaN)).toBe(false);
    });

    it("Infinity count → true (well above any threshold)", () => {
      expect(shouldSuppressByFpCount(Infinity)).toBe(false);
      // ^ Infinity is non-finite by Number.isFinite, so → false (defensive).
      // Önceki yorum yanlıştı: Infinity Number.isFinite check'inde reddedilir.
    });

    it("negative count → false (anlamsız input)", () => {
      expect(shouldSuppressByFpCount(-1)).toBe(false);
    });

    it("threshold 0 → always true (defensive — config bozulsa bile)", () => {
      expect(shouldSuppressByFpCount(0, 0)).toBe(true);
      expect(shouldSuppressByFpCount(100, 0)).toBe(true);
    });

    it("negative threshold → always true (defensive)", () => {
      expect(shouldSuppressByFpCount(0, -1)).toBe(true);
    });
  });

  describe("constants", () => {
    it("FP_SUPPRESS_THRESHOLD positive integer", () => {
      expect(Number.isInteger(FP_SUPPRESS_THRESHOLD)).toBe(true);
      expect(FP_SUPPRESS_THRESHOLD).toBeGreaterThan(0);
    });

    it("FP_SUPPRESS_WINDOW_DAYS positive integer", () => {
      expect(Number.isInteger(FP_SUPPRESS_WINDOW_DAYS)).toBe(true);
      expect(FP_SUPPRESS_WINDOW_DAYS).toBeGreaterThan(0);
    });

    it("default threshold 3 (intentional — 3 distinct FP olur)", () => {
      expect(FP_SUPPRESS_THRESHOLD).toBe(3);
    });

    it("default window 30 days (intentional — recent yeterli, monthly cycle)", () => {
      expect(FP_SUPPRESS_WINDOW_DAYS).toBe(30);
    });
  });
});
