import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ErpProfile } from "@/lib/erpProfiles";

const { getSchemaMock, getSampleRowsMock, getAnnotationsMock } = vi.hoisted(() => ({
  getSchemaMock: vi.fn(),
  getSampleRowsMock: vi.fn(),
  getAnnotationsMock: vi.fn(),
}));

vi.mock("@/lib/cache/schema", () => ({ getSchema: getSchemaMock }));
vi.mock("@/lib/cache/sampleRows", () => ({
  getSampleRows: getSampleRowsMock,
  sampleRowsToPromptContext: (rows: Record<string, unknown[]>) =>
    Object.keys(rows).length === 0 ? "" : `SAMPLE(${Object.keys(rows).join(",")})`,
}));
vi.mock("@/lib/cache/annotations", () => ({
  getAnnotations: getAnnotationsMock,
  annotationsToPromptContext: (lookup: Record<string, string>) =>
    Object.keys(lookup).length === 0 ? "" : `NOTES(${Object.keys(lookup).length})`,
}));
vi.mock("@/lib/erpProfiles", () => ({
  profileToPromptContext: (p: ErpProfile) => `PROFILE(${p.slug})`,
}));

import { buildChatPromptContext } from "./buildPromptContext";

function mkProfile(overrides: Partial<ErpProfile> = {}): ErpProfile {
  return {
    slug: "nebim_v3",
    name: "Nebim V3",
    canonical_tables: {},
    canonical_columns: {},
    important_columns: [],
    important_relations: [],
    common_patterns: [],
    ...overrides,
  } as unknown as ErpProfile;
}

describe("chat/buildChatPromptContext", () => {
  beforeEach(() => {
    getSchemaMock.mockReset();
    getSampleRowsMock.mockReset();
    getAnnotationsMock.mockReset();
  });

  it("returns full context shape when erpProfile present", async () => {
    getSchemaMock.mockResolvedValue("SCHEMA-X");
    getSampleRowsMock.mockResolvedValue({ tbl1: [{ a: 1 }] });
    getAnnotationsMock.mockResolvedValue({ "k.col": "annot" });

    const r = await buildChatPromptContext("c1", mkProfile(), "t1");

    expect(r.schema).toBe("SCHEMA-X");
    expect(r.profileContext).toBe("PROFILE(nebim_v3)");
    expect(r.sampleContext).toBe("SAMPLE(tbl1)");
    expect(r.annotationsContext).toBe("NOTES(1)");
    expect(r.erpName).toBe("Nebim V3");
  });

  it("erpProfile null → profileContext + sampleContext empty, erpName fallback 'ERP'", async () => {
    getSchemaMock.mockResolvedValue("SCHEMA-Y");
    getAnnotationsMock.mockResolvedValue({});

    const r = await buildChatPromptContext("c1", null, "t1");

    expect(r.schema).toBe("SCHEMA-Y");
    expect(r.profileContext).toBe("");
    expect(r.sampleContext).toBe("");
    expect(r.annotationsContext).toBe("");
    expect(r.erpName).toBe("ERP");
  });

  it("erpProfile null → getSampleRows NOT called (skip I/O)", async () => {
    getSchemaMock.mockResolvedValue("S");
    getAnnotationsMock.mockResolvedValue({});

    await buildChatPromptContext("c1", null, "t1");

    expect(getSampleRowsMock).not.toHaveBeenCalled();
  });

  it("calls getSchema with connectionId", async () => {
    getSchemaMock.mockResolvedValue("S");
    getSampleRowsMock.mockResolvedValue({});
    getAnnotationsMock.mockResolvedValue({});

    await buildChatPromptContext("conn-123", mkProfile(), "t1");

    expect(getSchemaMock).toHaveBeenCalledWith("conn-123");
  });

  it("calls getAnnotations with tenantId (multi-tenant scope)", async () => {
    getSchemaMock.mockResolvedValue("S");
    getSampleRowsMock.mockResolvedValue({});
    getAnnotationsMock.mockResolvedValue({});

    await buildChatPromptContext("c1", mkProfile(), "tenant-XYZ");

    expect(getAnnotationsMock).toHaveBeenCalledWith("tenant-XYZ");
  });

  it("calls getSampleRows with connectionId + profile when present", async () => {
    getSchemaMock.mockResolvedValue("S");
    getSampleRowsMock.mockResolvedValue({});
    getAnnotationsMock.mockResolvedValue({});

    const profile = mkProfile({ slug: "sap_ecc" });
    await buildChatPromptContext("conn-9", profile, "t1");

    expect(getSampleRowsMock).toHaveBeenCalledWith("conn-9", profile);
  });

  it("parallelizes I/O: schema + sampleRows + annotations all started before any resolves", async () => {
    let schemaStarted = false;
    let sampleStarted = false;
    let annotationsStarted = false;
    let firstResolved = false;

    getSchemaMock.mockImplementation(async () => {
      schemaStarted = true;
      // Resolve only after others also started (proves parallel start)
      while (!sampleStarted || !annotationsStarted) await new Promise((r) => setImmediate(r));
      firstResolved = true;
      return "S";
    });
    getSampleRowsMock.mockImplementation(async () => {
      sampleStarted = true;
      return {};
    });
    getAnnotationsMock.mockImplementation(async () => {
      annotationsStarted = true;
      return {};
    });

    await buildChatPromptContext("c1", mkProfile(), "t1");

    expect(schemaStarted).toBe(true);
    expect(sampleStarted).toBe(true);
    expect(annotationsStarted).toBe(true);
    expect(firstResolved).toBe(true);
  });
});
