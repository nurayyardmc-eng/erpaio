import { describe, it, expect } from "vitest";
import { fileDownloadResponse, jsonDownloadResponse } from "./download";

describe("http/download", () => {
  describe("fileDownloadResponse", () => {
    it("sets status 200 + attachment disposition + content type", async () => {
      const res = fileDownloadResponse("hello", {
        filename: "x.txt",
        contentType: "text/plain",
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/plain");
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="x.txt"',
      );
      expect(await res.text()).toBe("hello");
    });

    it("emits Cache-Control: no-store by default", () => {
      const res = fileDownloadResponse("b", { filename: "f", contentType: "text/plain" });
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("omits Cache-Control when noStore:false", () => {
      const res = fileDownloadResponse("b", {
        filename: "f",
        contentType: "text/plain",
        noStore: false,
      });
      expect(res.headers.get("Cache-Control")).toBeNull();
    });

    it("preserves charset in content type (markdown export)", () => {
      const res = fileDownloadResponse("# hi", {
        filename: "chat.md",
        contentType: "text/markdown; charset=utf-8",
      });
      expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    });
  });

  describe("jsonDownloadResponse", () => {
    it("pretty-prints with 2-space indent", async () => {
      const res = jsonDownloadResponse({ a: 1, b: [2] }, "data.json");
      expect(await res.text()).toBe(JSON.stringify({ a: 1, b: [2] }, null, 2));
    });

    it("uses application/json + attachment + no-store", () => {
      const res = jsonDownloadResponse({ ok: true }, "data.json");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/json");
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="data.json"',
      );
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });
});
