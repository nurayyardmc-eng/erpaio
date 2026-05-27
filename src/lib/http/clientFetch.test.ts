import { describe, it, expect, vi, beforeEach } from "vitest";
import { postJson, patchJson, putJson, deleteJson } from "./clientFetch";

describe("http/clientFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  describe("postJson", () => {
    it("calls fetch with POST method", async () => {
      await postJson("/api/test", { x: 1 });
      const init = fetchMock.mock.calls[0][1];
      expect(init.method).toBe("POST");
    });

    it("sets Content-Type: application/json", async () => {
      await postJson("/api/test", { x: 1 });
      const init = fetchMock.mock.calls[0][1];
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
    });

    it("serializes body via JSON.stringify", async () => {
      await postJson("/api/test", { name: "Acme", count: 42 });
      const init = fetchMock.mock.calls[0][1];
      expect(init.body).toBe(JSON.stringify({ name: "Acme", count: 42 }));
    });

    it("returns the Response object (no .json() called)", async () => {
      const res = await postJson("/api/test", {});
      expect(res).toBeInstanceOf(Response);
      expect(res.status).toBe(200);
    });

    it("URL passed verbatim (no transformation)", async () => {
      await postJson("/api/users?role=admin", {});
      expect(fetchMock.mock.calls[0][0]).toBe("/api/users?role=admin");
    });
  });

  describe("patchJson", () => {
    it("calls fetch with PATCH method", async () => {
      await patchJson("/api/test/1", { name: "x" });
      const init = fetchMock.mock.calls[0][1];
      expect(init.method).toBe("PATCH");
    });

    it("serializes body + sets JSON Content-Type", async () => {
      await patchJson("/api/test/1", { name: "x" });
      const init = fetchMock.mock.calls[0][1];
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
      expect(init.body).toBe(JSON.stringify({ name: "x" }));
    });
  });

  describe("putJson", () => {
    it("calls fetch with PUT method + JSON body", async () => {
      await putJson("/api/test/1", { a: 1 });
      const init = fetchMock.mock.calls[0][1];
      expect(init.method).toBe("PUT");
      expect(init.body).toBe(JSON.stringify({ a: 1 }));
    });
  });

  describe("deleteJson", () => {
    it("calls fetch with DELETE method + body", async () => {
      await deleteJson("/api/test", { id: "abc" });
      const init = fetchMock.mock.calls[0][1];
      expect(init.method).toBe("DELETE");
      expect(init.body).toBe(JSON.stringify({ id: "abc" }));
    });
  });

  it("all helpers handle empty object body", async () => {
    await postJson("/api/a", {});
    await patchJson("/api/b", {});
    await putJson("/api/d", {});
    await deleteJson("/api/c", {});
    expect(fetchMock.mock.calls).toHaveLength(4);
    for (const call of fetchMock.mock.calls) {
      expect(call[1].body).toBe("{}");
    }
  });

  it("body containing nested objects + arrays serializes correctly", async () => {
    const complex = { nested: { arr: [1, 2, { inner: "x" }] } };
    await postJson("/api/test", complex);
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(JSON.stringify(complex));
  });
});
