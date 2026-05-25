import { describe, it, expect } from "vitest";
import { resolveProfileSlug } from "./resolveSlug";

describe("erpProfiles/resolveSlug/resolveProfileSlug", () => {
  describe("explicit profile takes precedence", () => {
    it("erpProfile present → returns it verbatim", () => {
      expect(resolveProfileSlug("nebim_v3", "sap_ecc")).toBe("sap_ecc");
      expect(resolveProfileSlug("postgres", "oracle_ebs")).toBe("oracle_ebs");
      expect(resolveProfileSlug(null, "custom_one")).toBe("custom_one");
    });

    it("erpProfile preferred even when erpType is nebim_v3", () => {
      // Explicit profile beats legacy nebim heuristic.
      expect(resolveProfileSlug("nebim_v3", "my_custom")).toBe("my_custom");
    });
  });

  describe("legacy nebim fallback (erpProfile null)", () => {
    it("erpType=nebim_v3 + erpProfile null → 'nebim_v3'", () => {
      expect(resolveProfileSlug("nebim_v3", null)).toBe("nebim_v3");
    });

    it("erpType=nebim_v3 + erpProfile undefined → 'nebim_v3'", () => {
      expect(resolveProfileSlug("nebim_v3", undefined)).toBe("nebim_v3");
    });

    it("erpType=nebim_v3 + erpProfile empty string → 'nebim_v3' (falsy)", () => {
      expect(resolveProfileSlug("nebim_v3", "")).toBe("nebim_v3");
    });
  });

  describe("no fallback for other erpTypes", () => {
    it("erpType=postgres + erpProfile null → null", () => {
      expect(resolveProfileSlug("postgres", null)).toBeNull();
    });

    it("erpType=dynamics365 + erpProfile null → null", () => {
      expect(resolveProfileSlug("dynamics365", null)).toBeNull();
    });

    it("unknown erpType + erpProfile null → null", () => {
      expect(resolveProfileSlug("oracle_ebs", null)).toBeNull();
    });

    it("erpType null + erpProfile null → null", () => {
      expect(resolveProfileSlug(null, null)).toBeNull();
    });

    it("both undefined → null", () => {
      expect(resolveProfileSlug(undefined, undefined)).toBeNull();
    });
  });

  describe("case sensitivity (regression guard)", () => {
    it("erpType 'NEBIM_V3' (upper) does NOT match (lowercase canonical)", () => {
      expect(resolveProfileSlug("NEBIM_V3", null)).toBeNull();
    });

    it("erpType 'nebim_V3' (mixed) does NOT match", () => {
      expect(resolveProfileSlug("nebim_V3", null)).toBeNull();
    });
  });
});
