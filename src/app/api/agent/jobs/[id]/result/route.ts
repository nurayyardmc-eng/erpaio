// POST /api/agent/jobs/[id]/result — agent-authed. The agent posts back the
// terminal result (rows) or an error for a claimed job. The job is verified to
// belong to the agent's connection (tenant boundary) before writing.
import { authenticateAgent } from "@/lib/agent/auth";
import { completeJob } from "@/lib/agent/queue";
import { prisma } from "@/lib/db/prisma";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";
import { z } from "zod";

const Schema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).optional(),
  error: z.string().max(4000).optional(),
});

// The default 64 KB cap is for small JSON payloads; this endpoint receives a
// full ERP query RESULT (rows), which easily exceeds that. Capping at 64 KB
// rejected large results with a 413, so the job never completed and the cloud
// false-timed-out on a query that actually succeeded.
const MAX_RESULT_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tooBig = checkBodySize(req, MAX_RESULT_BYTES);
  if (tooBig) return tooBig;

  const agent = await authenticateAgent(req);
  if (!agent) return Response.json({ error: "unauthorized" }, { status: 401 });

  const limit = await rateLimit(agent.agentId, RATE_LIMITS.AGENT_POLL);
  if (!limit.success) return rateLimited429(req, limit);

  const { id } = await params;
  const body = await parseJsonBody(req, Schema);
  if (body instanceof Response) return body;

  // Tenant boundary: the job must belong to this agent's connection.
  const job = await prisma.agentQueryJob.findFirst({
    where: { id, connectionId: agent.connectionId },
    select: { id: true },
  });
  if (!job) return Response.json({ error: "job not found" }, { status: 404 });

  if (body.error !== undefined) {
    await completeJob(id, { error: body.error });
  } else {
    await completeJob(id, { rows: body.rows ?? [] });
  }

  return Response.json({ ok: true });
}
