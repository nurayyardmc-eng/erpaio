import { describe, it, expect } from "vitest";
import { userInitials } from "./initials";

describe("auth/initials/userInitials", () => {
  describe("name preference", () => {
    it("name present → derived from name", () => {
      expect(userInitials("Ali Veli", "x@y.com")).toBe("AV");
    });

    it("name empty → falls back to email", () => {
      expect(userInitials("", "ali@firma.com")).toBe("A");
    });

    it("name null → falls back to email", () => {
      expect(userInitials(null, "ali@firma.com")).toBe("A");
    });

    it("name undefined → falls back to email", () => {
      expect(userInitials(undefined, "ali@firma.com")).toBe("A");
    });

    it("name whitespace-only → falls back to email", () => {
      expect(userInitials("   ", "ali@firma.com")).toBe("A");
    });
  });

  describe("character extraction", () => {
    it("single name → first letter only", () => {
      expect(userInitials("Ahmet", null)).toBe("A");
    });

    it("first + last → both initials", () => {
      expect(userInitials("Ali Veli", null)).toBe("AV");
    });

    it("3+ words → first 2 only (slice cap)", () => {
      expect(userInitials("Ali Veli Hasan Tekin", null)).toBe("AV");
    });

    it("uppercases lowercase input", () => {
      expect(userInitials("ali veli", null)).toBe("AV");
    });

    it("preserves uppercase input", () => {
      expect(userInitials("ALI VELI", null)).toBe("AV");
    });
  });

  describe("Turkish characters", () => {
    it("Şirket adı → 'ŞA'", () => {
      expect(userInitials("Şirket Adı", null)).toBe("ŞA");
    });

    it("İlhan → 'İ' (locale-correct uppercase preserved)", () => {
      expect(userInitials("İlhan", null)).toBe("İ");
    });

    it("ümit → 'Ü'", () => {
      expect(userInitials("ümit", null)).toBe("Ü");
    });
  });

  describe("email fallback edge cases", () => {
    it("plain email no dot → first letter", () => {
      expect(userInitials(null, "user@example.com")).toBe("U");
    });

    it("email with space (unusual) → both initials", () => {
      expect(userInitials(null, "u s@example.com")).toBe("US");
    });

    it("empty both → empty string", () => {
      expect(userInitials("", "")).toBe("");
      expect(userInitials(null, null)).toBe("");
    });
  });

  describe("output invariants", () => {
    it("length ≤ 2 always", () => {
      const samples = ["A", "Ali", "Ali Veli", "Ali Veli Hasan", "ali@firma.com"];
      for (const s of samples) {
        expect(userInitials(s, null).length).toBeLessThanOrEqual(2);
      }
    });

    it("multiple consecutive spaces don't introduce empties beyond slice", () => {
      // "Ali  Veli" → ["Ali", "", "Veli"] → ["A", "", "V"] → "AV"
      expect(userInitials("Ali  Veli", null)).toBe("AV");
    });

    it("leading space handled (still 2 letters from later words)", () => {
      // " Ali Veli" → ["", "Ali", "Veli"] → ["", "A", "V"] → "AV" (slice 2)
      expect(userInitials(" Ali Veli", null)).toBe("AV");
    });
  });
});
