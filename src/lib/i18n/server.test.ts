import { describe, it, expect } from "vitest";
import { resolveLocale, serverMessages, jsonError } from "./server";

function mkReq(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("server i18n", () => {
  describe("resolveLocale", () => {
    it("no headers → default tr", () => {
      expect(resolveLocale(mkReq())).toBe("tr");
    });

    it("cookie wins over Accept-Language", () => {
      expect(
        resolveLocale(
          mkReq({
            cookie: "erpaio_lang=en; other=foo",
            "accept-language": "tr-TR,tr;q=0.9",
          }),
        ),
      ).toBe("en");
    });

    it("Accept-Language used when no cookie", () => {
      expect(resolveLocale(mkReq({ "accept-language": "en-US,en;q=0.9" }))).toBe("en");
    });

    it("Accept-Language honors q-value priority", () => {
      // Lower q for tr → en wins
      expect(
        resolveLocale(mkReq({ "accept-language": "tr;q=0.3,en;q=0.9" })),
      ).toBe("en");
    });

    it("Accept-Language base tag matched (tr-TR → tr)", () => {
      expect(resolveLocale(mkReq({ "accept-language": "tr-TR" }))).toBe("tr");
    });

    it("Unsupported locale falls back to default", () => {
      expect(resolveLocale(mkReq({ "accept-language": "de,fr;q=0.8" }))).toBe("tr");
    });

    it("Invalid cookie locale falls back to Accept-Language", () => {
      expect(
        resolveLocale(
          mkReq({ cookie: "erpaio_lang=xx", "accept-language": "en" }),
        ),
      ).toBe("en");
    });
  });

  describe("serverMessages", () => {
    it("returns TR messages for tr cookie", () => {
      const m = serverMessages(mkReq({ cookie: "erpaio_lang=tr" }));
      expect(m.api.unauthorized).toBe("Yetkisiz.");
    });

    it("returns EN messages for en cookie", () => {
      const m = serverMessages(mkReq({ cookie: "erpaio_lang=en" }));
      expect(m.api.unauthorized).toBe("Unauthorized.");
    });
  });

  describe("jsonError", () => {
    it("returns Response with correct error + status", async () => {
      const res = jsonError(
        mkReq({ cookie: "erpaio_lang=en" }),
        "api.unauthorized",
        401,
      );
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Unauthorized.");
    });

    it("falls back to serverError if key missing", async () => {
      // @ts-expect-error testing the runtime fallback
      const res = jsonError(mkReq(), "api.bogus", 500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Sunucu hatası.");
    });
  });
});
