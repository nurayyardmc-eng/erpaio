import { describe, it, expect } from "vitest";
import { filterCommands, groupByCategory, type PaletteCommand } from "./filter";

const SAMPLE: PaletteCommand[] = [
  { id: "chat", label: "Sohbet", group: "Git" },
  { id: "overview", label: "Anlık Metrikler", group: "Git" },
  { id: "alerts", label: "Bildirimler", group: "Git" },
  { id: "new-chat", label: "Yeni Sohbet Başlat", group: "Aksiyon" },
  { id: "logout", label: "Çıkış Yap", group: "Aksiyon" },
];

describe("command-palette/filter/filterCommands", () => {
  it("empty query → returns all commands", () => {
    expect(filterCommands(SAMPLE, "")).toEqual(SAMPLE);
  });

  it("exact label substring match", () => {
    const r = filterCommands(SAMPLE, "Sohbet");
    expect(r.map((c) => c.id)).toEqual(["chat", "new-chat"]);
  });

  it("case-insensitive matching", () => {
    expect(filterCommands(SAMPLE, "SOHBET").map((c) => c.id)).toEqual([
      "chat",
      "new-chat",
    ]);
    expect(filterCommands(SAMPLE, "sohbet").map((c) => c.id)).toEqual([
      "chat",
      "new-chat",
    ]);
  });

  it("partial substring matches (prefix/infix/suffix)", () => {
    expect(filterCommands(SAMPLE, "Bil").map((c) => c.id)).toEqual(["alerts"]);
    expect(filterCommands(SAMPLE, "lat").map((c) => c.id)).toEqual(["new-chat"]);
  });

  it("no match → empty array", () => {
    expect(filterCommands(SAMPLE, "xyz123")).toEqual([]);
  });

  it("preserves input order", () => {
    const r = filterCommands(SAMPLE, "e");
    // Each result's index in SAMPLE must be ascending.
    const indices = r.map((c) => SAMPLE.findIndex((s) => s.id === c.id));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("Turkish characters case-folded by JS lowercase (locale-naive)", () => {
    // "Çıkış" lowercased → "çıkış"; query "ç" should match.
    expect(filterCommands(SAMPLE, "ç").map((c) => c.id)).toEqual(["logout"]);
  });

  it("special chars passed through (no regex interpretation)", () => {
    const cmds = [{ id: "x", label: "[brackets].test", group: "Git" }];
    expect(filterCommands(cmds, "[bra")).toHaveLength(1);
  });

  it("empty commands array → empty result", () => {
    expect(filterCommands([], "anything")).toEqual([]);
  });

  it("returns same element references (no mapping)", () => {
    const r = filterCommands(SAMPLE, "Sohbet");
    expect(r[0]).toBe(SAMPLE[0]);
  });
});

describe("command-palette/filter/groupByCategory", () => {
  it("empty input → empty object", () => {
    expect(groupByCategory([])).toEqual({});
  });

  it("buckets by group field", () => {
    const r = groupByCategory(SAMPLE);
    expect(Object.keys(r)).toEqual(["Git", "Aksiyon"]);
    expect(r.Git).toHaveLength(3);
    expect(r.Aksiyon).toHaveLength(2);
  });

  it("preserves group insertion order (first appearance)", () => {
    const r = groupByCategory(SAMPLE);
    expect(Object.keys(r)).toEqual(["Git", "Aksiyon"]);
  });

  it("preserves item order within each group", () => {
    const r = groupByCategory(SAMPLE);
    expect(r.Git.map((c) => c.id)).toEqual(["chat", "overview", "alerts"]);
    expect(r.Aksiyon.map((c) => c.id)).toEqual(["new-chat", "logout"]);
  });

  it("single group when all commands share group", () => {
    const cmds = [
      { id: "a", label: "A", group: "X" },
      { id: "b", label: "B", group: "X" },
    ];
    expect(Object.keys(groupByCategory(cmds))).toEqual(["X"]);
  });

  it("returns same element references", () => {
    const r = groupByCategory(SAMPLE);
    expect(r.Git[0]).toBe(SAMPLE[0]);
  });

  it("works with extended Command type (T extends PaletteCommand)", () => {
    interface ExtCmd extends PaletteCommand {
      icon: string;
    }
    const cmds: ExtCmd[] = [
      { id: "a", label: "A", group: "G", icon: "🌟" },
    ];
    const r = groupByCategory(cmds);
    expect(r.G[0].icon).toBe("🌟");
  });
});
