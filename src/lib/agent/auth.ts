/**
 * Authenticate an on-prem agent by its bearer token (same hashing scheme as
 * the mobile ApiToken). Returns the agent's tenant + connection scope, or null.
 *
 * Defense: the returned tenantId/connectionId are the ONLY scope the agent can
 * act on — job-poll/result endpoints must filter by them, never trusting any
 * id from the request body.
 */
import { prisma } from "@/lib/db/prisma";
import { hashApiToken } from "@/lib/auth/apiToken";

export interface AuthedAgent {
  agentId: string;
  tenantId: string;
  connectionId: string;
}

export async function authenticateAgent(req: Request): Promise<AuthedAgent | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7).trim();
  if (raw.length < 16) return null;

  const tokenHash = hashApiToken(raw);
  const reg = await prisma.agentRegistration.findUnique({ where: { tokenHash } });
  if (!reg || reg.revoked) return null;

  // Liveness ping — fire-and-forget so the hot poll path isn't blocked.
  prisma.agentRegistration
    .update({ where: { id: reg.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return { agentId: reg.id, tenantId: reg.tenantId, connectionId: reg.connectionId };
}
