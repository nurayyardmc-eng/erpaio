import { describe, it, expect } from "vitest";
import { wantsYamlFormat } from "./contentNegotiation";

function mkReq(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("http/contentNegotiation/wantsYamlFormat", () => {
  describe("query parameter ?format=yaml", () => {
    it("?format=yaml → true", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api?format=yaml"))).toBe(true);
    });

    it("?format=json → false", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api?format=json"))).toBe(false);
    });

    it("?format=YAML (uppercase) → false (case-sensitive contract)", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api?format=YAML"))).toBe(false);
    });

    it("no query param → falls through to Accept header", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api"))).toBe(false);
    });

    it("?format=yaml overrides Accept: application/json", () => {
      expect(
        wantsYamlFormat(
          mkReq("https://e.com/api?format=yaml", { accept: "application/json" }),
        ),
      ).toBe(true);
    });
  });

  describe("Accept header", () => {
    it("application/yaml → true", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "application/yaml" })),
      ).toBe(true);
    });

    it("text/yaml → true", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "text/yaml" })),
      ).toBe(true);
    });

    it("application/x-yaml → true (substring match)", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "application/x-yaml" })),
      ).toBe(true);
    });

    it("multiple values with yaml in chain → true", () => {
      expect(
        wantsYamlFormat(
          mkReq("https://e.com/api", {
            accept: "application/json, application/yaml;q=0.8",
          }),
        ),
      ).toBe(true);
    });

    it("application/json → false", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "application/json" })),
      ).toBe(false);
    });

    it("text/plain → false", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "text/plain" })),
      ).toBe(false);
    });
  });

  describe("default behavior", () => {
    it("no query, no Accept → false (defaults to JSON)", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api"))).toBe(false);
    });

    it("empty Accept header → false", () => {
      expect(wantsYamlFormat(mkReq("https://e.com/api", { accept: "" }))).toBe(false);
    });

    it("wildcard accept */* → false (no yaml substring)", () => {
      expect(
        wantsYamlFormat(mkReq("https://e.com/api", { accept: "*/*" })),
      ).toBe(false);
    });
  });
});
