/**
 * Register an on-prem agent for a connection and mint its bearer token.
 *
 * Mirrors createMobileApiToken: plaintext token shown ONCE, only the SHA-256
 * hash is persisted (lookup via AgentRegistration.tokenHash). Agent tokens do
 * not expire by time (long-lived service); revoke via AgentRegistration.revoked.
 *
 * Also flips the connection into "agent" mode — from then on queryERP routes
 * its SQL through the job queue instead of a direct TCP pool.
 */
import { prisma } from "@/lib/db/prisma";
import { generateApiToken, hashApiToken } from "@/lib/auth/apiToken";

export interface AgentTokenResult {
  /** Plaintext token — shown once, then unrecoverable. */
  raw: string;
  /** AgentRegistration id. */
  agentId: string;
}

export async function createAgentToken(
  tenantId: string,
  connectionId: string,
  name: string | null,
): Promise<AgentTokenResult> {
  const raw = generateApiToken();
  const tokenHash = hashApiToken(raw);

  const agentId = await prisma.$transaction(async (tx) => {
    const reg = await tx.agentRegistration.create({
      data: { tenantId, connectionId, name, tokenHash },
      select: { id: true },
    });
    await tx.erpConnection.update({
      where: { id: connectionId },
      data: { connectionMode: "agent" },
    });
    return reg.id;
  });

  return { raw, agentId };
}
