import { describe, it, expect } from "vitest";
import { listProfiles, loadProfile } from "../index";

/**
 * Structural integrity check for shipped ERP profiles.
 *
 * Track GGGGGG — each YAML profile under src/lib/erpProfiles/profiles/ must
 * satisfy the loader's contract. A regression here (typo in YAML, missing
 * required field) silently breaks AI prompt context, returning vague
 * SQL or "ERP" generic prompts instead of profile-specific ones.
 */

describe("erpProfiles/profiles integrity (shipped profiles)", () => {
  const slugs = listProfiles();

  it("at least 3 profiles are registered (nebim_v3, sap_ecc, oracle_ebs)", () => {
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    expect(slugs).toContain("nebim_v3");
    expect(slugs).toContain("sap_ecc");
    expect(slugs).toContain("oracle_ebs");
  });

  for (const slug of slugs) {
    describe(`profile: ${slug}`, () => {
      const profile = loadProfile(slug);

      it("loads without error (YAML parses)", () => {
        expect(profile).not.toBeNull();
      });

      it("has matching slug", () => {
        expect(profile?.slug).toBe(slug);
      });

      it("has non-empty name", () => {
        expect(profile?.name).toBeTruthy();
        expect(typeof profile?.name).toBe("string");
      });

      it("has at least one canonical_table", () => {
        const tables = profile?.canonical_tables ?? {};
        expect(Object.keys(tables).length).toBeGreaterThan(0);
      });

      it("every canonical_table has description + important_columns", () => {
        const tables = profile?.canonical_tables ?? {};
        for (const [name, def] of Object.entries(tables)) {
          expect(def.description, `${name} missing description`).toBeTruthy();
          expect(Array.isArray(def.important_columns), `${name} important_columns not an array`).toBe(true);
        }
      });

      it("every important_columns entry has a name", () => {
        const tables = profile?.canonical_tables ?? {};
        for (const [tableName, def] of Object.entries(tables)) {
          for (const col of def.important_columns) {
            expect(col.name, `${tableName} column without name`).toBeTruthy();
          }
        }
      });
    });
  }
});

describe("erpProfiles/profiles canonical slug list (regression marker)", () => {
  it("no duplicate slugs", () => {
    const slugs = listProfiles();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("each slug is snake_case (no spaces, no uppercase)", () => {
    for (const slug of listProfiles()) {
      expect(slug).toMatch(/^[a-z0-9_]+$/);
    }
  });
});
