// GET /api/agent/jobs/next — agent-authed. Claim and return the oldest pending
// job for the agent's connection, or 204 when the queue is empty. The agent
// long-polls this endpoint.
import { authenticateAgent } from "@/lib/agent/auth";
import { claimNextJob } from "@/lib/agent/queue";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const agent = await authenticateAgent(req);
  if (!agent) return Response.json({ error: "unauthorized" }, { status: 401 });

  const limit = await rateLimit(agent.agentId, RATE_LIMITS.AGENT_POLL);
  if (!limit.success) return rateLimited429(req, limit);

  const job = await claimNextJob(agent.connectionId);
  if (!job) return new Response(null, { status: 204 });

  return Response.json({ id: job.id, sql: job.sql });
}
