// Sprint P2 — pre-flight token estimator.
//
// The budget gate (checkAndConsume) previously passed a hardcoded 5000
// tokens for every chat request, so the "estimate" bore no relation to
// the actual query. This replaces that magic number with a question-aware
// heuristic, and exposes the same function for surfacing a "this query
// ≈ N tokens" hint to the user (cost confidence).
//
// Model (intentionally conservative — the gate must lean slightly HIGH so
// it stays protective against over-spend):
//   total ≈ OUTPUT_ALLOWANCE + ceil((questionChars + contextChars) / CHARS_PER_TOKEN)
// At the gate the schema context isn't built yet, so contextChars
// defaults to a typical schema-dump size. Callers that already have the
// context (post-build) can pass the real size for a tighter estimate.

/** Rough average characters per token for mixed TR/EN + SQL text. */
export const CHARS_PER_TOKEN = 4;

/** Output budget reserved for the generated SQL + explanation. */
export const OUTPUT_ALLOWANCE = 1500;

/** Assumed schema-context size when the real context isn't available yet. */
export const DEFAULT_CONTEXT_CHARS = 12_000;

/** Floor so trivial questions still reserve a protective minimum. */
export const MIN_ESTIMATE = 2_000;

export interface EstimateInput {
  questionChars: number;
  /** Real schema/context size if known; otherwise DEFAULT_CONTEXT_CHARS. */
  contextChars?: number;
}

export function estimateChatTokens({ questionChars, contextChars }: EstimateInput): number {
  const ctx = contextChars ?? DEFAULT_CONTEXT_CHARS;
  const inputChars = Math.max(0, questionChars) + Math.max(0, ctx);
  const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const total = OUTPUT_ALLOWANCE + inputTokens;
  return Math.max(MIN_ESTIMATE, total);
}
