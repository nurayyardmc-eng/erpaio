import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parseQuery,
  parseJsonBody,
  zNumber,
  zBoolean,
  zIsoDate,
  zCuid,
  noFieldsToUpdateError,
  userNotFoundError,
  tenantNotFoundError,
  getRequiredIdParam,
  watchlistNotFoundError,
  connectionNotFoundError,
  activeConnectionNotFoundError,
  invalidQuestionError,
  incorrectPasswordError,
  sqlNotInHistoryError,
} from "./searchParams";

function reqWithLang(lang: "tr" | "en"): Request {
  return new Request("https://example.com/api/test", {
    headers: { "accept-language": lang },
  });
}

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

describe("zNumber", () => {
  it("parses string number", () => {
    expect(zNumber().parse("42")).toBe(42);
  });

  it("parses fractional number", () => {
    expect(zNumber().parse("3.14")).toBe(3.14);
  });

  it("int constraint rejects fractional", () => {
    expect(() => zNumber({ int: true }).parse("3.14")).toThrow();
  });

  it("int constraint accepts integer", () => {
    expect(zNumber({ int: true }).parse("42")).toBe(42);
  });

  it("min constraint enforced", () => {
    expect(() => zNumber({ min: 10 }).parse("5")).toThrow();
    expect(zNumber({ min: 10 }).parse("15")).toBe(15);
  });

  it("max constraint enforced", () => {
    expect(() => zNumber({ max: 100 }).parse("200")).toThrow();
    expect(zNumber({ max: 100 }).parse("50")).toBe(50);
  });

  it("default applied when undefined input", () => {
    expect(zNumber({ default: 25 }).parse(undefined)).toBe(25);
  });

  it("combined min+max+int+default", () => {
    const schema = zNumber({ min: 1, max: 50, default: 20, int: true });
    expect(schema.parse(undefined)).toBe(20);
    expect(schema.parse("10")).toBe(10);
    expect(() => schema.parse("100")).toThrow();
    expect(() => schema.parse("0")).toThrow();
  });

  it("Infinity rejected (refine Number.isFinite)", () => {
    expect(() => zNumber().parse("Infinity")).toThrow();
  });

  it("NaN rejected", () => {
    expect(() => zNumber().parse("not-a-number")).toThrow();
  });
});

describe("zIsoDate", () => {
  it("parses valid ISO string into Date", () => {
    const r = zIsoDate().parse("2026-05-26T12:00:00Z");
    expect(r).toBeInstanceOf(Date);
    expect(r.getUTCFullYear()).toBe(2026);
  });

  it("parses date-only format", () => {
    const r = zIsoDate().parse("2026-05-26");
    expect(r).toBeInstanceOf(Date);
  });

  it("rejects invalid date string", () => {
    expect(() => zIsoDate().parse("not-a-date")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => zIsoDate().parse("")).toThrow();
  });

  it("rejects gibberish", () => {
    expect(() => zIsoDate().parse("2026-13-45")).toThrow();
  });

  it("composes inside object schema", () => {
    const schema = z.object({ from: zIsoDate() });
    const r = schema.parse({ from: "2026-01-01T00:00:00Z" });
    expect(r.from).toBeInstanceOf(Date);
  });
});

describe("zCuid", () => {
  it("accepts cuid-shaped strings", () => {
    // cuid format: c + 24 chars (lowercase alphanumeric)
    expect(zCuid().parse("clxabcdefghijklmnopqrstu")).toBe("clxabcdefghijklmnopqrstu");
  });

  it("rejects empty string", () => {
    expect(() => zCuid().parse("")).toThrow();
  });
});

describe("noFieldsToUpdateError", () => {
  it("returns 400 Response", () => {
    const res = noFieldsToUpdateError(reqWithLang("tr"));
    expect(res.status).toBe(400);
  });

  it("TR locale body — 'Güncellenecek alan yok.'", async () => {
    const res = noFieldsToUpdateError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Güncellenecek alan yok.");
  });

  it("EN locale body — 'No fields to update.'", async () => {
    const res = noFieldsToUpdateError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("No fields to update.");
  });
});

describe("userNotFoundError", () => {
  it("returns 404", () => {
    const res = userNotFoundError(reqWithLang("tr"));
    expect(res.status).toBe(404);
  });

  it("TR body — 'Kullanıcı bulunamadı.'", async () => {
    const res = userNotFoundError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Kullanıcı bulunamadı.");
  });

  it("EN body — 'User not found.'", async () => {
    const res = userNotFoundError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("User not found.");
  });
});

describe("tenantNotFoundError", () => {
  it("returns 404", () => {
    const res = tenantNotFoundError(reqWithLang("tr"));
    expect(res.status).toBe(404);
  });

  it("TR body — 'Tenant bulunamadı.'", async () => {
    const res = tenantNotFoundError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Tenant bulunamadı.");
  });

  it("EN body — 'Tenant not found.'", async () => {
    const res = tenantNotFoundError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Tenant not found.");
  });
});

describe("getRequiredIdParam", () => {
  it("returns { id } when query param present", () => {
    const req = new Request("https://example.com/api/test?id=abc123");
    const r = getRequiredIdParam(req);
    expect(r).not.toBeInstanceOf(Response);
    if (r instanceof Response) return;
    expect(r.id).toBe("abc123");
  });

  it("returns 400 Response when id missing", () => {
    const req = new Request("https://example.com/api/test");
    const r = getRequiredIdParam(req);
    expect(r).toBeInstanceOf(Response);
    if (!(r instanceof Response)) return;
    expect(r.status).toBe(400);
  });

  it("returns 400 Response when id is empty string", () => {
    const req = new Request("https://example.com/api/test?id=");
    const r = getRequiredIdParam(req);
    expect(r).toBeInstanceOf(Response);
  });

  it("TR locale 400 body — 'id gerekli.'", async () => {
    const req = new Request("https://example.com/api/test", {
      headers: { "accept-language": "tr" },
    });
    const r = getRequiredIdParam(req);
    if (!(r instanceof Response)) throw new Error("expected Response");
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe("id gerekli.");
  });

  it("EN locale 400 body — 'id required.'", async () => {
    const req = new Request("https://example.com/api/test", {
      headers: { "accept-language": "en" },
    });
    const r = getRequiredIdParam(req);
    if (!(r instanceof Response)) throw new Error("expected Response");
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe("id required.");
  });

  it("ignores other query params, only checks id", () => {
    const req = new Request("https://example.com/api/test?other=foo&id=xyz");
    const r = getRequiredIdParam(req);
    if (r instanceof Response) throw new Error("expected success");
    expect(r.id).toBe("xyz");
  });

  it("preserves id casing and special chars", () => {
    const req = new Request("https://example.com/api/test?id=Abc-123_XYZ");
    const r = getRequiredIdParam(req);
    if (r instanceof Response) throw new Error("expected success");
    expect(r.id).toBe("Abc-123_XYZ");
  });
});

describe("watchlistNotFoundError", () => {
  it("returns 404", () => {
    const res = watchlistNotFoundError(reqWithLang("tr"));
    expect(res.status).toBe(404);
  });

  it("TR body — 'Watchlist bulunamadı.'", async () => {
    const res = watchlistNotFoundError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Watchlist bulunamadı.");
  });

  it("EN body — 'Watchlist not found.'", async () => {
    const res = watchlistNotFoundError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Watchlist not found.");
  });
});

describe("connectionNotFoundError", () => {
  it("returns 404", () => {
    const res = connectionNotFoundError(reqWithLang("tr"));
    expect(res.status).toBe(404);
  });

  it("TR body — 'Bağlantı bulunamadı.'", async () => {
    const res = connectionNotFoundError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Bağlantı bulunamadı.");
  });

  it("EN body — 'Connection not found.'", async () => {
    const res = connectionNotFoundError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Connection not found.");
  });
});

describe("activeConnectionNotFoundError", () => {
  it("returns 404", () => {
    const res = activeConnectionNotFoundError(reqWithLang("tr"));
    expect(res.status).toBe(404);
  });

  it("TR body — 'Aktif bağlantı bulunamadı.'", async () => {
    const res = activeConnectionNotFoundError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Aktif bağlantı bulunamadı.");
  });

  it("EN body — 'No active connection found.'", async () => {
    const res = activeConnectionNotFoundError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("No active connection found.");
  });

  it("differs from connectionNotFoundError (semantic distinction)", async () => {
    const active = activeConnectionNotFoundError(reqWithLang("tr"));
    const plain = connectionNotFoundError(reqWithLang("tr"));
    const activeBody = (await active.json()) as { error: string };
    const plainBody = (await plain.json()) as { error: string };
    expect(activeBody.error).not.toBe(plainBody.error);
  });
});

describe("invalidQuestionError", () => {
  it("returns 400", () => {
    const res = invalidQuestionError(reqWithLang("tr"));
    expect(res.status).toBe(400);
  });

  it("TR body — 'Geçersiz soru.'", async () => {
    const res = invalidQuestionError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Geçersiz soru.");
  });

  it("EN body — 'Invalid question.'", async () => {
    const res = invalidQuestionError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid question.");
  });
});

describe("incorrectPasswordError", () => {
  it("returns 400", () => {
    const res = incorrectPasswordError(reqWithLang("tr"));
    expect(res.status).toBe(400);
  });

  it("TR body — 'Mevcut şifre hatalı.'", async () => {
    const res = incorrectPasswordError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Mevcut şifre hatalı.");
  });

  it("EN body — 'Current password is incorrect.'", async () => {
    const res = incorrectPasswordError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Current password is incorrect.");
  });
});

describe("sqlNotInHistoryError", () => {
  it("returns 422 (unprocessable entity)", () => {
    const res = sqlNotInHistoryError(reqWithLang("tr"));
    expect(res.status).toBe(422);
  });

  it("TR body — mentions chat history prerequisite", async () => {
    const res = sqlNotInHistoryError(reqWithLang("tr"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(
      "Bu soru için chat geçmişinde SQL bulunamadı. Önce sohbette soruyu sorun.",
    );
  });

  it("EN body — mentions ask-in-chat-first prerequisite", async () => {
    const res = sqlNotInHistoryError(reqWithLang("en"));
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(
      "No SQL found in chat history for this question. Ask it in chat first.",
    );
  });
});
