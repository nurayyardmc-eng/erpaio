// File-download Response builders, shared by the export endpoints
// (tenant/export, connections/export, chat/sessions/[id]/export).
//
// Each previously hand-rolled the same Content-Disposition attachment +
// Content-Type (+ Cache-Control) header block. Consolidating keeps the
// attachment semantics — and the no-store posture for sensitive exports —
// identical across routes.

interface FileDownloadOpts {
  filename: string;
  contentType: string;
  /** Emit `Cache-Control: no-store` (default true — exports are sensitive). */
  noStore?: boolean;
}

/**
 * Build a 200 attachment Response for `body` with the given filename and
 * content type. Pure (no I/O); just assembles headers + Response.
 */
export function fileDownloadResponse(body: string, opts: FileDownloadOpts): Response {
  const headers: Record<string, string> = {
    "Content-Type": opts.contentType,
    "Content-Disposition": `attachment; filename="${opts.filename}"`,
  };
  if (opts.noStore !== false) headers["Cache-Control"] = "no-store";
  return new Response(body, { status: 200, headers });
}

/**
 * JSON file download: pretty-prints `data` (2-space indent, matching the
 * existing export bodies) as an application/json attachment with no-store.
 */
export function jsonDownloadResponse(data: unknown, filename: string): Response {
  return fileDownloadResponse(JSON.stringify(data, null, 2), {
    filename,
    contentType: "application/json",
  });
}
