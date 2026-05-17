import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseQuery, parseJsonBody, zNumber, zBoolean, zIsoDate, zCuid } from "./searchParams";

function mkReq(query: string, body?: unknown): Request {
  const url = `https://example.com/api/test${query ? `?${query}` : ""}`;
  return body !== undefined
    ? new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } })
    : new Request(url);
}

describe("parseQuery", () => {
  const S = z.object({
    limit: zNumber({ min: 1, max: 500, default: 100, int: true }),
    role: z.enum(["user", "assistant"]).optional(),
    success: zBoolean().optional(),
    before: zIsoDate().optional(),
  });

  it("defaults applied when missing", () => {
    const parsed = parseQuery(mkReq(""), S);
    expect(parsed).not.toBeInstanceOf(Response);
    if (parsed instanceof Response) return;
    expect(parsed.limit).toBe(100);
  });

  it("parses valid params", () => {
    const parsed = parseQuery(mkReq("limit=50&role=user&success=true"), S);
    expect(parsed).not.toBeInstanceOf(Response);
    if (parsed instanceof Response) return;
    expect(parsed.limit).toBe(50);
    expect(parsed.role).toBe("user");
    expect(parsed.success).toBe(true);
  });

  it("rejects NaN limit", async () => {
    const res = parseQuery(mkReq("limit=foo"), S);
    expect(res).toBeInstanceOf(Response);
    if (!(res instanceof Response)) return;
    expect(res.status).toBe(400);
  });

  it("rejects limit over max", async () => {
    const res = parseQuery(mkReq("limit=10000"), S);
    expect(res).toBeInstanceOf(Response);
    if (!(res instanceof Response)) return;
    expect(res.status).toBe(400);
  });

  it("rejects invalid enum role", async () => {
    const res = parseQuery(mkReq("role=admin"), S);
    expect(res).toBeInstanceOf(Response);
  });

  it("rejects invalid ISO date", async () => {
    const res = parseQuery(mkReq("before=not-a-date"), S);
    expect(res).toBeInstanceOf(Response);
  });

  it("accepts ISO date and returns Date", () => {
    const parsed = parseQuery(mkReq("before=2026-01-01T00%3A00%3A00Z"), S);
    expect(parsed).not.toBeInstanceOf(Response);
    if (parsed instanceof Response) return;
    expect(parsed.before).toBeInstanceOf(Date);
  });
});

describe("zBoolean", () => {
  const S = z.object({ flag: zBoolean() });

  it("accepts 'true'", () => {
    const parsed = parseQuery(mkReq("flag=true"), S);
    if (parsed instanceof Response) throw new Error("expected success");
    expect(parsed.flag).toBe(true);
  });

  it("accepts '1'", () => {
    const parsed = parseQuery(mkReq("flag=1"), S);
    if (parsed instanceof Response) throw new Error("expected success");
    expect(parsed.flag).toBe(true);
  });

  it("accepts case-insensitive 'FALSE'", () => {
    const parsed = parseQuery(mkReq("flag=FALSE"), S);
    if (parsed instanceof Response) throw new Error("expected success");
    expect(parsed.flag).toBe(false);
  });

  it("rejects truthy strings like 'yes'", () => {
    const res = parseQuery(mkReq("flag=yes"), S);
    expect(res).toBeInstanceOf(Response);
  });
});

describe("zCuid", () => {
  const S = z.object({ id: zCuid() });

  it("accepts cuid-like id", () => {
    const parsed = parseQuery(mkReq("id=abc123_-XYZ"), S);
    if (parsed instanceof Response) throw new Error("expected success");
    expect(parsed.id).toBe("abc123_-XYZ");
  });

  it("rejects whitespace", () => {
    const res = parseQuery(mkReq("id=has space"), S);
    expect(res).toBeInstanceOf(Response);
  });

  it("rejects too long", () => {
    const res = parseQuery(mkReq(`id=${"a".repeat(100)}`), S);
    expect(res).toBeInstanceOf(Response);
  });
});

describe("parseJsonBody", () => {
  const S = z.object({ name: z.string().min(1).max(100) });

  it("parses valid body", async () => {
    const parsed = await parseJsonBody(mkReq("", { name: "Acme" }), S);
    if (parsed instanceof Response) throw new Error("expected success");
    expect(parsed.name).toBe("Acme");
  });

  it("rejects missing required field", async () => {
    const res = await parseJsonBody(mkReq("", {}), S);
    expect(res).toBeInstanceOf(Response);
  });

  it("rejects invalid JSON gracefully", async () => {
    const req = new Request("https://example.com/api/test", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await parseJsonBody(req, S);
    expect(res).toBeInstanceOf(Response);
    if (!(res instanceof Response)) return;
    expect(res.status).toBe(400);
  });
});
