import { describe, it, expect } from "vitest";
import { parseAiResponse } from "./parseResponse";

describe("ai/parseResponse/parseAiResponse", () => {
  describe("happy path (valid JSON)", () => {
    it("parses all fields when present", () => {
      const r = parseAiResponse(
        JSON.stringify({
          sql: "SELECT * FROM Users",
          confidence: 0.9,
          explanation: "Listing users",
          ambiguity: null,
        }),
      );
      expect(r).toEqual({
        sql: "SELECT * FROM Users",
        confidence: 0.9,
        explanation: "Listing users",
        ambiguity: null,
      });
    });

    it("trims sql whitespace", () => {
      const r = parseAiResponse('{"sql":"  SELECT 1  ","confidence":0.8}');
      expect(r.sql).toBe("SELECT 1");
    });

    it("ambiguity as non-null string preserved", () => {
      const r = parseAiResponse(
        JSON.stringify({ sql: "x", confidence: 0.8, ambiguity: "hangi tarih?" }),
      );
      expect(r.ambiguity).toBe("hangi tarih?");
    });
  });

  describe("markdown fence cleanup", () => {
    it("strips ```json fence at start and ``` at end", () => {
      const r = parseAiResponse('```json\n{"sql":"SELECT 1","confidence":0.9}\n```');
      expect(r.sql).toBe("SELECT 1");
      expect(r.confidence).toBe(0.9);
    });

    it("strips bare ``` fence (no json tag)", () => {
      const r = parseAiResponse('```\n{"sql":"X","confidence":1}\n```');
      expect(r.sql).toBe("X");
    });

    it("case-insensitive fence tag", () => {
      const r = parseAiResponse('```JSON\n{"sql":"X","confidence":1}\n```');
      expect(r.sql).toBe("X");
    });

    it("no fences → still parses", () => {
      const r = parseAiResponse('{"sql":"X","confidence":1}');
      expect(r.sql).toBe("X");
    });
  });

  describe("confidence clamping", () => {
    it("confidence in [0,1] passes through", () => {
      expect(parseAiResponse('{"sql":"x","confidence":0}').confidence).toBe(0);
      expect(parseAiResponse('{"sql":"x","confidence":0.5}').confidence).toBe(0.5);
      expect(parseAiResponse('{"sql":"x","confidence":1}').confidence).toBe(1);
    });

    it("confidence > 1 → defaults to 0.5 (defensive)", () => {
      expect(parseAiResponse('{"sql":"x","confidence":1.5}').confidence).toBe(0.5);
    });

    it("confidence < 0 → defaults to 0.5", () => {
      expect(parseAiResponse('{"sql":"x","confidence":-0.1}').confidence).toBe(0.5);
    });

    it("confidence non-number → defaults to 0.5", () => {
      expect(parseAiResponse('{"sql":"x","confidence":"high"}').confidence).toBe(0.5);
      expect(parseAiResponse('{"sql":"x","confidence":null}').confidence).toBe(0.5);
    });

    it("confidence missing → defaults to 0.5", () => {
      expect(parseAiResponse('{"sql":"x"}').confidence).toBe(0.5);
    });
  });

  describe("field type coercion (defensive)", () => {
    it("sql non-string → empty string", () => {
      expect(parseAiResponse('{"sql":123,"confidence":0.9}').sql).toBe("");
      expect(parseAiResponse('{"sql":null,"confidence":0.9}').sql).toBe("");
      expect(parseAiResponse('{}').sql).toBe("");
    });

    it("explanation non-string → empty string", () => {
      expect(parseAiResponse('{"sql":"x","explanation":123}').explanation).toBe("");
    });

    it("ambiguity non-string → null", () => {
      expect(parseAiResponse('{"sql":"x","ambiguity":123}').ambiguity).toBeNull();
      expect(parseAiResponse('{"sql":"x"}').ambiguity).toBeNull();
    });
  });

  describe("JSON parse failure → raw SQL fallback", () => {
    it("plain SQL without JSON → returns as sql + confidence 0.7", () => {
      const r = parseAiResponse("SELECT * FROM Users WHERE id = 1");
      expect(r.sql).toBe("SELECT * FROM Users WHERE id = 1");
      expect(r.confidence).toBe(0.7);
      expect(r.explanation).toBe("");
      expect(r.ambiguity).toBeNull();
    });

    it("malformed JSON → fallback uses entire cleaned text as sql", () => {
      const r = parseAiResponse('{"sql":"X", "confidence":');
      expect(r.confidence).toBe(0.7);
      // Fallback: cleaned text itself becomes sql since JSON parse failed.
      expect(r.sql).toBe('{"sql":"X", "confidence":');
    });

    it("strips fences before fallback", () => {
      const r = parseAiResponse("```sql\nSELECT 1\n```");
      // sql fence not stripped (only json fence) — cleaned still includes "sql\n"
      // but the trim + replace doesn't match "```sql" prefix.
      // Document current behavior:
      expect(r.confidence).toBe(0.7);
    });

    it("empty string → empty sql + 0.7 confidence", () => {
      const r = parseAiResponse("");
      expect(r.sql).toBe("");
      expect(r.confidence).toBe(0.7);
    });

    it("just whitespace → empty sql", () => {
      const r = parseAiResponse("   \n\n   ");
      expect(r.sql).toBe("");
    });
  });

  describe("edge cases", () => {
    it("ignores extra fields in JSON", () => {
      const r = parseAiResponse(
        '{"sql":"x","confidence":0.9,"explanation":"e","ambiguity":null,"extra":"ignored"}',
      );
      expect(r).toEqual({
        sql: "x",
        confidence: 0.9,
        explanation: "e",
        ambiguity: null,
      });
    });

    it("sql with embedded newlines preserved", () => {
      const r = parseAiResponse(
        JSON.stringify({ sql: "SELECT *\nFROM Users", confidence: 0.9 }),
      );
      expect(r.sql).toBe("SELECT *\nFROM Users");
    });

    it("turkish chars in explanation preserved", () => {
      const r = parseAiResponse(
        JSON.stringify({ sql: "x", confidence: 0.9, explanation: "Müşteri verisini çekiyorum" }),
      );
      expect(r.explanation).toBe("Müşteri verisini çekiyorum");
    });
  });
});
