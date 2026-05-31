import { describe, it, expect } from "vitest";
import { resolveFlag, snapshotFlags, FLAG_DEFAULTS } from "./featureFlags";

describe("lib/featureFlags/resolveFlag", () => {
  it("returns the default when no env / override", () => {
    expect(resolveFlag("iyzico-billing", { env: {} })).toBe(
      FLAG_DEFAULTS["iyzico-billing"].default,
    );
  });

  it("override=true wins over env=false", () => {
    expect(
      resolveFlag("ai-cost-tooltip", {
        override: true,
        env: { FEATURE_FLAG_AI_COST_TOOLTIP: "0" },
      }),
    ).toBe(true);
  });

  it("override=false wins over env=true", () => {
    expect(
      resolveFlag("ai-cost-tooltip", {
        override: false,
        env: { FEATURE_FLAG_AI_COST_TOOLTIP: "1" },
      }),
    ).toBe(false);
  });

  it("env=on enables a default-off flag", () => {
    expect(
      resolveFlag("ai-cost-tooltip", { env: { FEATURE_FLAG_AI_COST_TOOLTIP: "on" } }),
    ).toBe(true);
  });

  it("env=off disables a default-on flag", () => {
    expect(
      resolveFlag("iyzico-billing", { env: { FEATURE_FLAG_IYZICO_BILLING: "off" } }),
    ).toBe(false);
  });

  it("env accepts case-insensitive truthy values", () => {
    for (const v of ["1", "true", "TRUE", "on", "yes"]) {
      expect(
        resolveFlag("ai-cost-tooltip", { env: { FEATURE_FLAG_AI_COST_TOOLTIP: v } }),
      ).toBe(true);
    }
  });

  it("env accepts case-insensitive falsy values", () => {
    for (const v of ["0", "false", "FALSE", "off", "no"]) {
      expect(
        resolveFlag("iyzico-billing", { env: { FEATURE_FLAG_IYZICO_BILLING: v } }),
      ).toBe(false);
    }
  });

  it("ambiguous env value falls through to default", () => {
    expect(
      resolveFlag("ai-cost-tooltip", { env: { FEATURE_FLAG_AI_COST_TOOLTIP: "maybe" } }),
    ).toBe(FLAG_DEFAULTS["ai-cost-tooltip"].default);
  });

  it("empty env value falls through to default", () => {
    expect(
      resolveFlag("iyzico-billing", { env: { FEATURE_FLAG_IYZICO_BILLING: "" } }),
    ).toBe(FLAG_DEFAULTS["iyzico-billing"].default);
  });

  it("override=null is treated as no override (env wins)", () => {
    expect(
      resolveFlag("ai-cost-tooltip", {
        override: null,
        env: { FEATURE_FLAG_AI_COST_TOOLTIP: "1" },
      }),
    ).toBe(true);
  });
});

describe("lib/featureFlags/snapshotFlags", () => {
  it("returns one entry per FLAG_DEFAULTS key", () => {
    const snap = snapshotFlags();
    expect(snap.length).toBe(Object.keys(FLAG_DEFAULTS).length);
    const keys = snap.map((s) => s.key).sort();
    expect(keys).toEqual(Object.keys(FLAG_DEFAULTS).sort());
  });

  it("each entry exposes enabled boolean + source + description", () => {
    const snap = snapshotFlags();
    for (const e of snap) {
      expect(typeof e.enabled).toBe("boolean");
      expect(["env", "default"]).toContain(e.source);
      expect(e.description.length).toBeGreaterThan(0);
    }
  });
});
