import { describe, it, expect } from "vitest";
import { runWithConcurrency } from "./concurrency";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("http/concurrency/runWithConcurrency", () => {
  it("empty items → empty array", async () => {
    const r = await runWithConcurrency([], 3, async () => 1);
    expect(r).toEqual([]);
  });

  it("processes all items (length preserved)", async () => {
    const r = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(r).toHaveLength(5);
    expect(r.map((x) => (x.status === "fulfilled" ? x.value : null))).toEqual([2, 4, 6, 8, 10]);
  });

  it("preserves input order in results array", async () => {
    // Slow item first, fast item second — result[0] should still be slow's value.
    const r = await runWithConcurrency(
      [50, 0, 30, 10],
      4,
      async (ms) => {
        await sleep(ms);
        return ms;
      },
    );
    expect(r.map((x) => (x.status === "fulfilled" ? x.value : null))).toEqual([50, 0, 30, 10]);
  });

  it("rejection becomes 'rejected' settled result (no early termination)", async () => {
    const r = await runWithConcurrency(
      [1, 2, 3, 4],
      2,
      async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      },
    );
    expect(r[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(r[1].status).toBe("rejected");
    expect(r[2]).toEqual({ status: "fulfilled", value: 3 });
    expect(r[3]).toEqual({ status: "fulfilled", value: 4 });
  });

  it("never exceeds `concurrency` in-flight workers", async () => {
    let inFlight = 0;
    let peak = 0;
    await runWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(5);
        inFlight--;
      },
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(0);
  });

  it("concurrency higher than item count → capped at item count (no over-spawn)", async () => {
    let peak = 0;
    let inFlight = 0;
    await runWithConcurrency(
      [1, 2, 3],
      100,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(2);
        inFlight--;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("concurrency = 1 → strictly sequential execution", async () => {
    const order: number[] = [];
    let inFlight = 0;
    let peak = 0;
    await runWithConcurrency(
      [10, 5, 1],
      1,
      async (n) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(n);
        order.push(n);
        inFlight--;
      },
    );
    expect(peak).toBe(1);
    // Sequential: input order maintained in execution since only one at a time.
    expect(order).toEqual([10, 5, 1]);
  });

  it("concurrency 0 or negative throws", async () => {
    await expect(
      runWithConcurrency([1], 0, async () => 1),
    ).rejects.toThrow(/concurrency/);
    await expect(
      runWithConcurrency([1], -1, async () => 1),
    ).rejects.toThrow(/concurrency/);
  });

  it("all-rejecting worker still returns full-length result", async () => {
    const r = await runWithConcurrency(
      [1, 2, 3],
      2,
      async () => {
        throw new Error("always");
      },
    );
    expect(r).toHaveLength(3);
    expect(r.every((x) => x.status === "rejected")).toBe(true);
  });

  it("non-Error rejection preserved verbatim in reason", async () => {
    const r = await runWithConcurrency(
      [1],
      1,
      async () => {
        throw "string-reason";
      },
    );
    expect(r[0]).toEqual({ status: "rejected", reason: "string-reason" });
  });

  it("processes large item count without recursion issues", async () => {
    const N = 200;
    const r = await runWithConcurrency(
      Array.from({ length: N }, (_, i) => i),
      8,
      async (n) => n,
    );
    expect(r).toHaveLength(N);
    expect(r.every((x) => x.status === "fulfilled")).toBe(true);
  });
});
