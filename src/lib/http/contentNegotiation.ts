/**
 * HTTP content-type negotiation helpers.
 *
 * Extracted (Track TTTTT) from src/app/api/openapi/route.ts so the
 * "is the caller asking for YAML?" decision tree can be tested without
 * mounting a Next.js route.
 *
 * Order of precedence (matches OpenAPI route convention):
 *   1. Explicit `?format=yaml` query parameter
 *   2. `Accept` header containing "yaml" substring (matches both
 *      `text/yaml` and `application/yaml`)
 *   3. Default: false → caller serves JSON
 */
export function wantsYamlFormat(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "yaml") return true;
  const accept = req.headers.get("accept");
  if (accept && /yaml/.test(accept)) return true;
  return false;
}
