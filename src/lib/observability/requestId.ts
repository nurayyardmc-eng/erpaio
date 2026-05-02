import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(req: Request): string {
  return req.headers.get(REQUEST_ID_HEADER) ?? randomUUID();
}
