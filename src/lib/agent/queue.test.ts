import { describe, it, expect, vi, beforeEach } from "vitest";

const { create, findUnique, findFirst, updateMany, update } = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { agentQueryJob: { create, findUnique, findFirst, updateMany, update } },
}));

import { enqueueAgentJob, waitForAgentJob, claimNextJob, completeJob } from "./queue";

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  findFirst.mockReset();
  updateMany.mockReset();
  update.mockReset();
});

describe("agent/queue enqueueAgentJob", () => {
  it("creates a pending job scoped to tenant + connection, returns id", async () => {
    create.mockResolvedValueOnce({ id: "job1" });
    const id = await enqueueAgentJob("conn1", "tenantA", "SELECT 1");
    expect(id).toBe("job1");
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ connectionId: "conn1", tenantId: "tenantA", sql: "SELECT 1", status: "pending" });
  });
});

describe("agent/queue claimNextJob", () => {
  it("returns null when nothing pending", async () => {
    findFirst.mockResolvedValueOnce(null);
    expect(await claimNextJob("conn1")).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("claims the oldest pending job (guarded update count 1)", async () => {
    findFirst.mockResolvedValueOnce({ id: "job1", sql: "SELECT 1" });
    updateMany.mockResolvedValueOnce({ count: 1 });
    const job = await claimNextJob("conn1");
    expect(job).toEqual({ id: "job1", sql: "SELECT 1" });
    // guard: only flips rows still pending
    expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: "job1", status: "pending" });
    expect(updateMany.mock.calls[0][0].data.status).toBe("running");
  });

  it("returns null when the row was claimed by someone else (count 0)", async () => {
    findFirst.mockResolvedValueOnce({ id: "job1", sql: "SELECT 1" });
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await claimNextJob("conn1")).toBeNull();
  });
});

describe("agent/queue waitForAgentJob", () => {
  it("resolves rows on done", async () => {
    findUnique.mockResolvedValueOnce({ status: "done", resultJson: JSON.stringify([{ a: 1 }]) });
    const rows = await waitForAgentJob("job1", 1000, 5);
    expect(rows).toEqual([{ a: 1 }]);
  });

  it("returns [] when done with null resultJson", async () => {
    findUnique.mockResolvedValueOnce({ status: "done", resultJson: null });
    expect(await waitForAgentJob("job1", 1000, 5)).toEqual([]);
  });

  it("throws the agent error message on error", async () => {
    findUnique.mockResolvedValueOnce({ status: "error", errorMessage: "syntax error" });
    await expect(waitForAgentJob("job1", 1000, 5)).rejects.toThrow("syntax error");
  });

  it("throws when the job row disappears", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(waitForAgentJob("job1", 1000, 5)).rejects.toThrow(/not found/i);
  });

  it("throws on timeout while still pending", async () => {
    findUnique.mockResolvedValue({ status: "pending", resultJson: null });
    await expect(waitForAgentJob("job1", 20, 5)).rejects.toThrow(/in time/i);
  });

  it("polls until the job transitions to done", async () => {
    findUnique
      .mockResolvedValueOnce({ status: "pending", resultJson: null })
      .mockResolvedValueOnce({ status: "running", resultJson: null })
      .mockResolvedValueOnce({ status: "done", resultJson: JSON.stringify([{ ok: true }]) });
    const rows = await waitForAgentJob("job1", 1000, 1);
    expect(rows).toEqual([{ ok: true }]);
    expect(findUnique).toHaveBeenCalledTimes(3);
  });
});

describe("agent/queue completeJob", () => {
  it("writes done + serialized rows", async () => {
    update.mockResolvedValueOnce({});
    await completeJob("job1", { rows: [{ x: 1 }] });
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("done");
    expect(JSON.parse(data.resultJson)).toEqual([{ x: 1 }]);
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it("writes error + truncates long messages", async () => {
    update.mockResolvedValueOnce({});
    await completeJob("job1", { error: "e".repeat(5000) });
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("error");
    expect(data.errorMessage.length).toBe(2000);
  });
});
