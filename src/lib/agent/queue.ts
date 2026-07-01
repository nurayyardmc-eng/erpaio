/**
 * Agent job queue — the Vercel-compatible transport for agent-backed
 * connections. The cloud enqueues a "pending" job and polls the row until the
 * on-prem agent writes back "done"/"error". No persistent socket required.
 */
import { prisma } from "@/lib/db/prisma";
import { isAgentOnline } from "./online";

// Must cover the on-prem agent's own QueryTimeout (15s, poll.go) plus the
// agent's ~1s poll-pickup and the write-back/observe latency — otherwise a
// legitimate 12–15s query completes on the agent but the cloud has already
// abandoned the wait and surfaces a false timeout to the user. (Was 12s, which
// was tighter than both the agent AND the direct-path requestTimeout of 15s.)
export const AGENT_JOB_TIMEOUT_MS = 18_000;
const POLL_MS = 300;
const MAX_ERROR_LEN = 2000;

/**
 * Throw immediately if no live agent is polling this connection. Prevents an
 * offline-agent request from hanging the full job timeout (which grew to 18s).
 * Reuses isAgentOnline so "offline" here means the same thing the dashboard
 * shows.
 */
export async function assertAgentOnline(connectionId: string): Promise<void> {
  const reg = await prisma.agentRegistration.findFirst({
    where: { connectionId, revoked: false },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });
  if (!isAgentOnline(reg?.lastSeenAt?.toISOString() ?? null)) {
    throw new Error("On-prem agent is offline (not polling). Start the agent and retry.");
  }
}

/** Enqueue a SQL job for an agent-backed connection. Returns the job id. */
export async function enqueueAgentJob(
  connectionId: string,
  tenantId: string,
  sql: string,
): Promise<string> {
  const job = await prisma.agentQueryJob.create({
    data: { connectionId, tenantId, sql, status: "pending" },
    select: { id: true },
  });
  return job.id;
}

/**
 * Poll a job row until it reaches a terminal state. Resolves with rows on
 * "done", throws on "error" or timeout. Tight loop with a short DB read; the
 * Vercel function holds for at most timeoutMs (parity with the direct-path
 * requestTimeout).
 */
export async function waitForAgentJob(
  jobId: string,
  timeoutMs: number = AGENT_JOB_TIMEOUT_MS,
  pollMs: number = POLL_MS,
): Promise<Record<string, unknown>[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = await prisma.agentQueryJob.findUnique({
      where: { id: jobId },
      select: { status: true, resultJson: true, errorMessage: true },
    });
    if (!job) throw new Error("Agent job not found");
    if (job.status === "done") {
      return job.resultJson ? (JSON.parse(job.resultJson) as Record<string, unknown>[]) : [];
    }
    if (job.status === "error") {
      throw new Error(job.errorMessage || "Agent query failed");
    }
    if (Date.now() >= deadline) {
      throw new Error("Agent did not respond in time — is the on-prem agent running?");
    }
    await sleep(pollMs);
  }
}

/**
 * Atomically claim the oldest pending job for a connection. Uses
 * optimistic concurrency (guarded updateMany) so two concurrent polls can
 * never hand out the same job. Returns null when nothing is pending or the
 * row was claimed by someone else in between.
 */
export async function claimNextJob(
  connectionId: string,
): Promise<{ id: string; sql: string } | null> {
  const pending = await prisma.agentQueryJob.findFirst({
    where: { connectionId, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true, sql: true },
  });
  if (!pending) return null;

  const claimed = await prisma.agentQueryJob.updateMany({
    where: { id: pending.id, status: "pending" }, // guard: still pending
    data: { status: "running", claimedAt: new Date() },
  });
  if (claimed.count === 0) return null; // lost the race; caller may re-poll

  return pending;
}

/** Write back the terminal result for a claimed job. */
export async function completeJob(
  jobId: string,
  result: { rows: Record<string, unknown>[] } | { error: string },
): Promise<void> {
  const data =
    "error" in result
      ? {
          status: "error",
          errorMessage: result.error.slice(0, MAX_ERROR_LEN),
          completedAt: new Date(),
        }
      : {
          status: "done",
          resultJson: JSON.stringify(result.rows),
          completedAt: new Date(),
        };
  await prisma.agentQueryJob.update({ where: { id: jobId }, data });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
