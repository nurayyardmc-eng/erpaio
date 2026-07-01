/**
 * Convert an Anthropic API usage object into the billable token count
 * recorded against the tenant's monthly budget.
 *
 * Billing model (Track HHHHH — extracted from chat route):
 *   billable = input_tokens + output_tokens + cache_creation_input_tokens
 *
 * cache_read_input_tokens is INTENTIONALLY EXCLUDED. Prompt cache reads
 * cost ~10× less than uncached reads at the API level; charging the
 * customer the full input rate would penalize them for our optimization.
 * Anthropic's own pricing reflects this; we mirror it.
 *
 * Cache creation IS billed (it's a one-time premium over normal input
 * tokens; subsequent reads recoup the cost across many requests).
 *
 * Missing cache_creation field (model didn't write to cache that turn) →
 * counted as 0.
 */
export interface AnthropicUsageShape {
  input_tokens: number;
  output_tokens: number;
  // The Anthropic SDK types these as `number | null` (null when the model
  // didn't touch the cache that turn). Both consumers below coalesce, so accept
  // null directly — callers no longer need a type assertion.
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function calculateBillableTokens(usage: AnthropicUsageShape): number {
  return (
    usage.input_tokens +
    usage.output_tokens +
    (usage.cache_creation_input_tokens ?? 0)
  );
}

/** Whether this turn benefited from prompt cache (read > 0). */
export function isPromptCacheHit(usage: AnthropicUsageShape): boolean {
  return (
    typeof usage.cache_read_input_tokens === "number" &&
    usage.cache_read_input_tokens > 0
  );
}
