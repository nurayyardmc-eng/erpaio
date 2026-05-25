import { describe, it, expect } from "vitest";
import {
  groupColumnsByTable,
  buildEmbeddingText,
  type SchemaRow,
} from "./buildText";

function row(t: string, c: string, type = "nvarchar"): SchemaRow {
  return { TABLE_NAME: t, COLUMN_NAME: c, DATA_TYPE: type };
}

describe("embeddings/buildText/groupColumnsByTable", () => {
  it("empty rows → empty map", () => {
    expect(groupColumnsByTable([]).size).toBe(0);
  });

  it("formats each column as 'name:type'", () => {
    const map = groupColumnsByTable([row("Users", "id", "int")]);
    expect(map.get("Users")).toEqual(["id:int"]);
  });

  it("groups multiple columns under same table", () => {
    const map = groupColumnsByTable([
      row("Users", "id", "int"),
      row("Users", "email", "nvarchar"),
      row("Users", "createdAt", "datetime"),
    ]);
    expect(map.get("Users")).toEqual([
      "id:int",
      "email:nvarchar",
      "createdAt:datetime",
    ]);
  });

  it("separates distinct tables", () => {
    const map = groupColumnsByTable([
      row("Orders", "id", "int"),
      row("Users", "id", "uuid"),
    ]);
    expect(map.size).toBe(2);
    expect(map.get("Orders")).toEqual(["id:int"]);
    expect(map.get("Users")).toEqual(["id:uuid"]);
  });

  it("preserves table insertion order (Map default)", () => {
    const map = groupColumnsByTable([
      row("Z", "a"),
      row("A", "b"),
      row("M", "c"),
    ]);
    expect([...map.keys()]).toEqual(["Z", "A", "M"]);
  });

  it("preserves column insertion order within table", () => {
    const map = groupColumnsByTable([
      row("T", "z"),
      row("T", "a"),
      row("T", "m"),
    ]);
    expect(map.get("T")).toEqual(["z:nvarchar", "a:nvarchar", "m:nvarchar"]);
  });

  it("interleaved rows still grouped per table", () => {
    const map = groupColumnsByTable([
      row("Orders", "id"),
      row("Users", "id"),
      row("Orders", "total"),
    ]);
    expect(map.get("Orders")).toEqual(["id:nvarchar", "total:nvarchar"]);
    expect(map.get("Users")).toEqual(["id:nvarchar"]);
  });

  it("duplicate columns within table not deduped (verbatim)", () => {
    const map = groupColumnsByTable([row("T", "x"), row("T", "x")]);
    expect(map.get("T")).toEqual(["x:nvarchar", "x:nvarchar"]);
  });
});

describe("embeddings/buildText/buildEmbeddingText", () => {
  it("basic: 'table description aliases cols' (.trim)", () => {
    expect(buildEmbeddingText("Orders", "sales facts", ["sipariş"], ["id:int"])).toBe(
      "Orders sales facts sipariş id:int",
    );
  });

  it("aliases joined by ', '", () => {
    expect(
      buildEmbeddingText("T", "desc", ["a", "b", "c"], ["col:t"]),
    ).toBe("T desc a, b, c col:t");
  });

  it("empty description → no extra spaces beyond trim", () => {
    // Internal multi-spaces preserved (collapse not part of contract).
    const t = buildEmbeddingText("T", "", ["alias"], ["col:t"]);
    expect(t).toBe("T  alias col:t");
  });

  it("empty aliases array → empty join, internal spaces preserved", () => {
    expect(buildEmbeddingText("T", "desc", [], ["col:t"])).toBe(
      "T desc  col:t",
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(buildEmbeddingText("T", "", [], [])).toBe("T");
  });

  it("columns joined by single space", () => {
    expect(
      buildEmbeddingText("T", "", [], ["a:int", "b:int", "c:int"]),
    ).toBe("T   a:int b:int c:int");
  });

  it("only first 10 columns included (cap)", () => {
    const cols = Array.from({ length: 25 }, (_, i) => `c${i}:int`);
    const text = buildEmbeddingText("T", "", [], cols);
    expect(text).toContain("c0:int");
    expect(text).toContain("c9:int");
    expect(text).not.toContain("c10:int");
    expect(text).not.toContain("c24:int");
  });

  it("exactly 10 columns → all included", () => {
    const cols = Array.from({ length: 10 }, (_, i) => `c${i}:int`);
    const text = buildEmbeddingText("T", "", [], cols);
    expect(text).toContain("c9:int");
  });

  it("unicode (Turkish) preserved", () => {
    expect(buildEmbeddingText("Müşteri", "müşteri kart", ["cari"], [])).toBe(
      "Müşteri müşteri kart cari",
    );
  });

  it("aliases with internal commas not escaped (caller responsibility)", () => {
    // Documented: profile aliases are dev-controlled, no special chars expected.
    const t = buildEmbeddingText("T", "", ["a, b", "c"], []);
    expect(t).toContain("a, b, c");
  });

  it("Nebim-style realistic input", () => {
    const t = buildEmbeddingText(
      "cdCariKart",
      "Müşteri ve tedarikçi kartları (cariler)",
      ["müşteri", "tedarikçi", "cari", "firma"],
      ["CariKodu:nvarchar", "CariUnvani:nvarchar", "CariTipi:int"],
    );
    expect(t).toContain("cdCariKart");
    expect(t).toContain("Müşteri ve tedarikçi");
    expect(t).toContain("müşteri, tedarikçi, cari, firma");
    expect(t).toContain("CariKodu:nvarchar");
  });
});
