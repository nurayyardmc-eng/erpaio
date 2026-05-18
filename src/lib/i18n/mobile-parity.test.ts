import { describe, it, expect } from "vitest";
import { tr as mobileTr } from "../../../mobile/src/lib/i18n/tr";
import { en as mobileEn } from "../../../mobile/src/lib/i18n/en";

/**
 * Mobile i18n tr/en parity tests (Track CCCC).
 * Mobile vitest run etmediği için bu test web suite üzerinden mobile
 * dictionary'i import edip parity'i doğrular. Mobile Dictionary type
 * web'inkinden bağımsız (yapısal olarak farklı namespaces) — burada
 * yalnız tr↔en içsel parity test edilir.
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
      if (v.trim() === "" && !/Prefix|Suffix/.test(path)) {
        empties.push(path);
      }
    } else if (v && typeof v === "object") {
      empties.push(...findEmpty(v, path));
    }
  }
  return empties.sort();
}

describe("i18n/mobile-parity", () => {
  it("mobile tr and en have identical key sets", () => {
    const trKeys = collectKeys(mobileTr);
    const enKeys = collectKeys(mobileEn);
    const trOnly = trKeys.filter((k) => !enKeys.includes(k));
    const enOnly = enKeys.filter((k) => !trKeys.includes(k));
    expect(trOnly).toEqual([]);
    expect(enOnly).toEqual([]);
  });

  it("mobile tr has no unexpectedly empty string values", () => {
    expect(findEmpty(mobileTr)).toEqual([]);
  });

  it("mobile en has no unexpectedly empty string values", () => {
    expect(findEmpty(mobileEn)).toEqual([]);
  });

  it("mobile non-trivial coverage: > 200 keys per locale", () => {
    expect(collectKeys(mobileTr).length).toBeGreaterThan(200);
    expect(collectKeys(mobileEn).length).toBeGreaterThan(200);
  });
});
