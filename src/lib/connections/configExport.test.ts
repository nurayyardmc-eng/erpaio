import { describe, it, expect } from "vitest";
import { buildConfigExport, CONFIG_EXPORT_VERSION } from "./configExport";

const row = {
  erpType: "nebim_v3",
  erpProfile: "nebim",
  host: "db.firma.com",
  port: 1433,
  dbName: "NebimDB",
  username: "erpaio_ro",
};

describe("lib/connections/configExport/buildConfigExport", () => {
  it("includes version + ISO exportedAt", () => {
    const out = buildConfigExport([row], new Date("2026-05-31T12:00:00.000Z"));
    expect(out.version).toBe(CONFIG_EXPORT_VERSION);
    expect(out.exportedAt).toBe("2026-05-31T12:00:00.000Z");
  });

  it("maps connection metadata fields", () => {
    const out = buildConfigExport([row]);
    expect(out.connections[0]).toEqual({
      erpType: "nebim_v3",
      erpProfile: "nebim",
      host: "db.firma.com",
      port: 1433,
      dbName: "NebimDB",
      username: "erpaio_ro",
    });
  });

  it("NEVER leaks a password field even if present on the input", () => {
    const dirty = { ...row, passwordEnc: "super-secret-cipher", password: "plain" } as never;
    const out = buildConfigExport([dirty]);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain("super-secret-cipher");
    expect(serialized).not.toContain("plain");
    expect(serialized.toLowerCase()).not.toContain("password");
    expect(serialized).not.toContain("passwordEnc");
  });

  it("handles multiple connections + null erpProfile", () => {
    const out = buildConfigExport([row, { ...row, erpProfile: null, host: "db2" }]);
    expect(out.connections).toHaveLength(2);
    expect(out.connections[1].erpProfile).toBeNull();
    expect(out.connections[1].host).toBe("db2");
  });

  it("empty input → empty connections array", () => {
    expect(buildConfigExport([]).connections).toEqual([]);
  });
});
