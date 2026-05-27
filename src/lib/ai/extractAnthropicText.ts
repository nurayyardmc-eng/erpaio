/**
 * Extract the first text block from an Anthropic Message response.
 *
 * Track IIIIIIIIIII — 3 chat route AYNI 2-satirlik pattern'i yapiyordu:
 *   const block = msg.content.find((b) => b.type === "text");
 *   const raw = (block && "text" in block ? block.text : "")?.trim() ?? FALLBACK;
 *
 * Sites:
 *   * chat/route (fallback: "")
 *   * chat/follow-ups (fallback: "[]" — JSON array bekliyor)
 *   * chat/explain (fallback: "")
 *
 * Anthropic SDK Message.content `Array<ContentBlock>` doner; her block
 * type'i farkli (text, tool_use, tool_result, image vb). "text" type
 * en yaygin path — SQL/JSON/string yaniti buradan cikarilir.
 *
 * `in` operatoru: TypeScript narrowing icin "text" in block kontrolu
 * gerekiyor (tool_use'da text field yok); runtime'da bu zaten true
 * cunku type=="text" filter'lendi.
 */

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageLike {
  content: ReadonlyArray<AnthropicContentBlock>;
}

export function extractAnthropicText(
  msg: AnthropicMessageLike,
  fallback: string = "",
): string {
  const block = msg.content.find((b) => b.type === "text");
  const text = (block && "text" in block ? block.text : "")?.trim();
  return text ?? fallback;
}
