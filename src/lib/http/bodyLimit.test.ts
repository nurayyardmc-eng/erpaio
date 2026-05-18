import { describe, it, expect } from "vitest";
import { checkBodySize, MAX_BODY_BYTES } from "./bodyLimit";

function mkReq(headers: Record<string, string>): Request {
  return new Request("https://example.test/", { headers });
}

describe("http/bodyLimit", () => {
  it("MAX_BODY_BYTES exported as 64KB default", () => {
    expect(MAX_BODY_BYTES).toBe(64 * 1024);
  });

  it("returns null when content-length header missing (let downstream parse)", () => {
    const req = mkReq({});
    expect(checkBodySize(req)).toBeNull();
  });

  it("returns null when content-length within default limit", () => {
    const req = mkReq({ "content-length": "1000" });
    expect(checkBodySize(req)).toBeNull();
  });

  it("returns null when content-length equals limit exactly (>= boundary check)", () => {
    const req = mkReq({ "content-length": String(MAX_BODY_BYTES) });
    // logic: len > max → response. len === max passes through (null).
    expect(checkBodySize(req)).toBeNull();
  });

  it("returns 413 response when content-length exceeds default limit", async () => {
    const req = mkReq({ "content-length": String(MAX_BODY_BYTES + 1) });
    const res = checkBodySize(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(413);
    const body = await res!.json();
    expect(body.error).toContain("çok büyük");
  });

  it("respects custom max parameter (override)", () => {
    const small = 100;
    const ok = checkBodySize(mkReq({ "content-length": "50" }), small);
    const fail = checkBodySize(mkReq({ "content-length": "101" }), small);
    expect(ok).toBeNull();
    expect(fail).not.toBeNull();
    expect(fail!.status).toBe(413);
  });

  it("non-numeric content-length passes through (Number.isFinite guard)", () => {
    const req = mkReq({ "content-length": "not-a-number" });
    expect(checkBodySize(req)).toBeNull();
  });

  it("content-length 0 passes through", () => {
    const req = mkReq({ "content-length": "0" });
    expect(checkBodySize(req)).toBeNull();
  });

  it("Infinity-ish header (huge value) caught by Number.isFinite — still passes if NaN", () => {
    // "Infinity" string → Number → Infinity → !isFinite → null (passes)
    const req = mkReq({ "content-length": "Infinity" });
    expect(checkBodySize(req)).toBeNull();
  });
});
