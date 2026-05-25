/**
 * Pure parser for AI (Claude) responses returning a JSON object with SQL +
 * confidence + explanation + ambiguity. Extracted (Track AAAAA) from
 * src/app/api/chat/route.ts so the cleanup + JSON parse + shape validation
 * can be unit-tested without booting Prisma or hitting the API.
 *
 * Lenient by design:
 *  - Strips ```json fences emitted by the model (markdown-mode artifact).
 *  - On JSON parse failure, treats the entire cleaned text as a raw SQL
 *    response with a baseline confidence of 0.7 — covers the case where
 *    the model returns SQL without wrapping it in JSON.
 *  - Confidence clamped to [0, 1]; out-of-range values default to 0.5
 *    so a misbehaving model can't bypass the confidence gate.
 */
export interface AiResponse {
  sql: string;
  confidence: number;
  explanation: string;
  ambiguity: string | null;
}

export function parseAiResponse(raw: string): AiResponse {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<AiResponse>;
    return {
      sql: typeof parsed.sql === "string" ? parsed.sql.trim() : "",
      confidence:
        typeof parsed.confidence === "number" &&
        parsed.confidence >= 0 &&
        parsed.confidence <= 1
          ? parsed.confidence
          : 0.5,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
      ambiguity: typeof parsed.ambiguity === "string" ? parsed.ambiguity : null,
    };
  } catch {
    return {
      sql: cleaned,
      confidence: 0.7,
      explanation: "",
      ambiguity: null,
    };
  }
}
