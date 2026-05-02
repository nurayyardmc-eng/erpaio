export const MAX_BODY_BYTES = 64 * 1024;

export function checkBodySize(req: Request, max: number = MAX_BODY_BYTES): Response | null {
  const lenHeader = req.headers.get("content-length");
  if (!lenHeader) return null;
  const len = Number(lenHeader);
  if (Number.isFinite(len) && len > max) {
    return Response.json(
      { error: `Request body çok büyük (max ${max} bytes).` },
      { status: 413 },
    );
  }
  return null;
}
