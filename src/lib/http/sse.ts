/**
 * Server-Sent Events frame formatter.
 *
 * Why this is a stand-alone module:
 *  - The SSE wire format is a strict contract: `event: <name>\ndata: <json>\n\n`.
 *    A missing newline, a stray CR, or improper JSON breaks every browser/RN
 *    EventSource client without a server-side error to alert us.
 *  - Used by chat stream + future streaming endpoints (forecast, anomaly).
 *  - Extracted from src/app/api/chat/stream/route.ts (Track VVVV).
 *
 * NOTE: SSE allows multiline `data:` continuations but we always JSON-encode
 * so there are no literal newlines inside the payload — single `data:` line
 * is sufficient.
 */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
