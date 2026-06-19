// POST /api/agent/token — dashboard-authed. Generate a bearer token for an
// on-prem agent bound to one of the caller's connections, and flip that
// connection into "agent" mode. Plaintext token returned ONCE.
import { getAuth } from "@/lib/auth/dual";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { assertOwnedConnection } from "@/lib/db/erpConnection";
import { enforceUserRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { recordUserActivity } from "@/lib/audit/activity";
import { createAgentToken } from "@/lib/agent/createAgentToken";
import { z } from "zod";

const Schema = z.object({
  connectionId: z.string().min(1),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.CONNECTION_MUTATE);
  if (limited) return limited;

  const body = await parseJsonBody(req, Schema);
  if (body instanceof Response) return body;

  const denied = await assertOwnedConnection(req, body.connectionId, session.user.tenantId);
  if (denied) return denied;

  const { raw, agentId } = await createAgentToken(
    session.user.tenantId,
    body.connectionId,
    body.name ?? null,
  );

  await recordUserActivity(req, session, {
    action: "integration.update",
    target: body.connectionId,
    metadata: { agentToken: "created", agentId, mode: "agent" },
  });

  return Response.json({ token: raw, agentId });
}
