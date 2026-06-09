import { describe, it, expect } from "vitest";
import { EN } from "./content";
import { TR } from "./contentTr";
import { AR } from "./contentAr";

// The LandingContent TS type guarantees every locale has the same KEYS, but it
// cannot catch array-length drift (e.g. EN gains a 4th feature/option/footer
// link that TR/AR never get) or an empty translation. This test enforces full
// structural parity across EN/TR/AR and flags blank strings (translation gaps).

/** All leaf paths of a value, with object keys sorted + array indices included. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .flatMap((k) =>
        leafPaths((value as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
      );
  }
  return [prefix];
}

/** Every string leaf with its path, for emptiness checks. */
function stringLeaves(value: unknown, prefix = ""): Array<[string, string]> {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => stringLeaves(v, `${prefix}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value).flatMap((k) =>
      stringLeaves((value as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    );
  }
  return typeof value === "string" ? [[prefix, value]] : [];
}

describe("landing content parity (EN/TR/AR)", () => {
  const enPaths = leafPaths(EN);

  it("TR has the exact same structure as EN (keys + array lengths)", () => {
    expect(leafPaths(TR)).toEqual(enPaths);
  });

  it("AR has the exact same structure as EN (keys + array lengths)", () => {
    expect(leafPaths(AR)).toEqual(enPaths);
  });

  it("no blank string values in any locale (translation gap guard)", () => {
    for (const [locale, content] of [
      ["EN", EN],
      ["TR", TR],
      ["AR", AR],
    ] as const) {
      const blanks = stringLeaves(content)
        .filter(([, v]) => v.trim() === "")
        .map(([p]) => `${locale}.${p}`);
      expect(blanks).toEqual([]);
    }
  });
});
