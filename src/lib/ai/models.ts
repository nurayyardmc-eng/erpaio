/**
 * Anthropic Claude model IDs used across the codebase.
 *
 * Track IIIIIIIII — 4 chat route (chat, chat/stream, chat/follow-ups,
 * chat/explain) inline model string kullaniyordu. Yeni bir model'e
 * upgrade (orn. claude-sonnet-4-6) 4 yerde dolaşmak demek; centralized
 * sabitlerle tek noktada degisir.
 *
 * Routing intuition:
 *   - SONNET: NL→SQL generation (chat, chat/stream) — kalite gerekli
 *   - HAIKU: post-result helpers (explain, follow-ups) — hiz + maliyet
 *
 * CLAUDE.md / AGENTS.md "knowledge cutoff" notlarinda da bahsedilir;
 * production'da bu sabitler tek noktada tutulur.
 */

/** High-quality model for NL→SQL synthesis. */
export const MODEL_SONNET = "claude-sonnet-4-5";

/** Fast/cheap model for explain + follow-up suggestion paths. */
export const MODEL_HAIKU = "claude-haiku-4-5";
