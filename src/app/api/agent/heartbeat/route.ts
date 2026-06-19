// POST /api/agent/heartbeat — agent-authed liveness ping. authenticateAgent
// already updates lastSeenAt, so this just confirms the token is valid (used by
// the agent on startup and as a keepalive; powers the "agent online" badge).
import { authenticateAgent } from "@/lib/agent/auth";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const agent = await authenticateAgent(req);
  if (!agent) return Response.json({ error: "unauthorized" }, { status: 401 });

  const limit = await rateLimit(agent.agentId, RATE_LIMITS.AGENT_POLL);
  if (!limit.success) return rateLimited429(req, limit);

  return Response.json({ ok: true });
}
