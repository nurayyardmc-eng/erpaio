import { describe, it, expect } from "vitest";
import { tr } from "./tr";
import { en } from "./en";

/**
 * TS dictionary type compile-time'da parity'i zorlar (Dictionary shape).
 * Runtime test: değerler boş/whitespace değil, function-key'ler eşleşiyor.
 */

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string" || typeof v === "function") {
      keys.push(path);
    } else if (typeof v === "object") {
      keys.push(...collectKeys(v, path));
    }
  }
  return keys.sort();
}

function findEmpty(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const empties: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      // Some keys legitimately need an empty string (e.g. trialBanner.daysLeftPrefix);
      // count as empty only if value is exactly "" but key name doesn't end in
      // "Prefix"/"Suffix" — those are intentionally empty as locale-specific.
      if (v.trim() === "" && !/Prefix|Suffix/.test(path)) {
        empties.push(path);
      }
    } else if (v && typeof v === "object") {
      empties.push(...findEmpty(v, path));
    }
  }
  return empties.sort();
}

describe("i18n/parity", () => {
  it("tr and en have identical key sets", () => {
    const trKeys = collectKeys(tr);
    const enKeys = collectKeys(en);
    const trOnly = trKeys.filter((k) => !enKeys.includes(k));
    const enOnly = enKeys.filter((k) => !trKeys.includes(k));
    expect(trOnly).toEqual([]);
    expect(enOnly).toEqual([]);
  });

  it("tr has no unexpectedly empty string values", () => {
    const empties = findEmpty(tr);
    expect(empties).toEqual([]);
  });

  it("en has no unexpectedly empty string values", () => {
    const empties = findEmpty(en);
    expect(empties).toEqual([]);
  });

  it("function-typed keys (like bulkPromptSelected) exist symmetrically", () => {
    // Spot check known function keys
    expect(typeof tr.alerts.bulkPromptSelected).toBe("function");
    expect(typeof en.alerts.bulkPromptSelected).toBe("function");
    expect(typeof tr.nps).toBe("object");
    expect(typeof en.nps).toBe("object");
  });

  it("function keys actually return strings", () => {
    expect(typeof tr.alerts.bulkPromptSelected(3)).toBe("string");
    expect(typeof en.alerts.bulkPromptSelected(3)).toBe("string");
  });

  it("non-trivial key coverage: > 200 keys total per locale", () => {
    // Sanity check that the dictionary actually has substance
    expect(collectKeys(tr).length).toBeGreaterThan(200);
    expect(collectKeys(en).length).toBeGreaterThan(200);
  });
});
