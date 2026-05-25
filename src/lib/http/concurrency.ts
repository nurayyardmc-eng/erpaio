/**
 * Bounded concurrency pool.
 *
 * Runs `worker` over `items` with at most `concurrency` in-flight at any
 * moment. Returns `PromiseSettledResult` per input so callers can inspect
 * rejections without losing successful results.
 *
 * Why not Promise.allSettled with chunking: chunking introduces stragglers —
 * a single slow tenant in a chunk blocks the next chunk from starting.
 * This worker-pool pattern keeps `concurrency` slots always busy until
 * every item has been processed.
 *
 * Extracted (Track WWWW) from src/app/api/cron/anomaly-detection so other
 * cron jobs (watchlists, scheduled-reports) can reuse the same primitive.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (concurrency <= 0) throw new Error("concurrency must be positive");
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        const value = await worker(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return results;
}
