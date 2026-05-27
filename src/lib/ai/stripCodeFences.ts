/**
 * Strip markdown code fences (```json, ```, etc) from AI response text.
 *
 * Track JJJJJJJJJJJ — 2 site AYNI 3-step replace+trim pattern'i kullaniyordu:
 *   * lib/ai/parseResponse.ts (parseAiResponse internal cleanup)
 *   * app/api/chat/follow-ups (JSON.parse oncesi cleanup)
 *
 * Anthropic Claude markdown mode'da yanitlari ```json ... ``` veya
 * ``` ... ``` ile sarmalayabiliyor. Pure-JSON istesek bile model
 * occasional olarak fence ekliyor; bu helper hem prefix hem suffix'i
 * temizliyor + trim.
 *
 * Pattern:
 *   * Prefix: ```json (case-insensitive) veya ``` baslangici
 *   * Suffix: ``` sonu
 *   * Trim: tum whitespace siniri
 *
 * NOT: orta blok'taki ``` etkilenmez (nested code block edge case
 * Claude'un yanit format'inda gormeyiz). String literal icindeki
 * \`\`\` regex'le esleserse cleanup yanlis olur — risk yok cunku
 * model JSON dondurmesi ic-cikti.
 */
export function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
