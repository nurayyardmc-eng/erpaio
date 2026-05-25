import { describe, it, expect } from "vitest";
import { scoreAndRankCandidates } from "./searchTables";
import { vecToHex } from "./cosine";

// Helper: build a candidate with given vector encoded as hex.
function cand(name: string, vec: number[], column: string | null = null) {
  return {
    tableName: name,
    columnName: column,
    text: `${name} ${column ?? ""}`.trim(),
    embeddingHex: vecToHex(vec),
  };
}

describe("embeddings/searchTables/scoreAndRankCandidates", () => {
  it("empty candidates → empty array", () => {
    expect(scoreAndRankCandidates([1, 0, 0], [], 10)).toEqual([]);
  });

  it("identical vector → score ≈ 1 (top match)", () => {
    const query = [1, 2, 3];
    const results = scoreAndRankCandidates(
      query,
      [cand("Match", [1, 2, 3]), cand("Other", [0, 0, 1])],
      10,
    );
    expect(results[0].tableName).toBe("Match");
    expect(results[0].score).toBeCloseTo(1, 5);
  });

  it("orthogonal vector → score 0", () => {
    const results = scoreAndRankCandidates(
      [1, 0, 0],
      [cand("Orthogonal", [0, 1, 0])],
      10,
    );
    expect(results[0].score).toBeCloseTo(0, 5);
  });

  it("sorts by score descending", () => {
    const query = [1, 0];
    const results = scoreAndRankCandidates(
      query,
      [
        cand("Far", [-1, 0]),     // score -1
        cand("Close", [0.9, 0.1]), // high positive
        cand("Mid", [0.5, 0.5]),   // medium
      ],
      10,
    );
    expect(results[0].tableName).toBe("Close");
    expect(results[1].tableName).toBe("Mid");
    expect(results[2].tableName).toBe("Far");
  });

  it("respects topN slice", () => {
    const query = [1, 0];
    const results = scoreAndRankCandidates(
      query,
      [
        cand("A", [1, 0]),
        cand("B", [0.9, 0.1]),
        cand("C", [0.8, 0.2]),
        cand("D", [0.7, 0.3]),
      ],
      2,
    );
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.tableName)).toEqual(["A", "B"]);
  });

  it("topN larger than candidate count → returns all", () => {
    const results = scoreAndRankCandidates(
      [1, 0],
      [cand("A", [1, 0]), cand("B", [0, 1])],
      100,
    );
    expect(results).toHaveLength(2);
  });

  it("topN=0 → empty result", () => {
    const results = scoreAndRankCandidates(
      [1, 0],
      [cand("A", [1, 0])],
      0,
    );
    expect(results).toEqual([]);
  });

  it("preserves columnName field (null and string both)", () => {
    const results = scoreAndRankCandidates(
      [1, 0],
      [cand("T1", [1, 0], null), cand("T2", [0.5, 0.5], "id")],
      10,
    );
    expect(results[0].columnName).toBe(null);
    expect(results[1].columnName).toBe("id");
  });

  it("preserves text field", () => {
    const results = scoreAndRankCandidates(
      [1, 0],
      [cand("Orders", [1, 0], "customerId")],
      10,
    );
    expect(results[0].text).toBe("Orders customerId");
  });

  it("score field is the cosine similarity", () => {
    const results = scoreAndRankCandidates(
      [1, 1],
      [cand("Same", [1, 1])],
      10,
    );
    expect(results[0].score).toBeCloseTo(1, 5);
  });

  it("zero-vector candidate gracefully scored 0 (no NaN)", () => {
    const results = scoreAndRankCandidates(
      [1, 0],
      [cand("Zero", [0, 0]), cand("Normal", [1, 0])],
      10,
    );
    expect(Number.isFinite(results[0].score)).toBe(true);
    expect(results[1].score).toBe(0);
    expect(results[1].tableName).toBe("Zero");
  });
});
