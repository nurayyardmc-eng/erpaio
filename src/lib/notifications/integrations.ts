import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encrypt";
import { sendSlack } from "./slack";
import { sendTeams } from "./teams";
import { sendWebhook } from "./genericWebhook";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "integrations" });

export type IntegrationKind = "slack" | "teams" | "webhook";

interface AlertData {
  id: string;
  type: string;
  severity: string;
  title: string;
  description?: string | null;
  evidence?: unknown;
}

export async function dispatchAlert(tenantId: string, alert: AlertData): Promise<void> {
  const integrations = await prisma.tenantIntegration.findMany({
    where: { tenantId, enabled: true },
    select: { id: true, kind: true, endpointEnc: true, secretEnc: true },
  });

  if (integrations.length === 0) return;

  await Promise.allSettled(
    integrations.map(async (it) => {
      try {
        const url = decrypt(it.endpointEnc);
        const secret = it.secretEnc ? decrypt(it.secretEnc) : null;

        let result: { ok: boolean };
        if (it.kind === "slack") {
          result = await sendSlack({
            webhookUrl: url,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
          });
        } else if (it.kind === "teams") {
          result = await sendTeams({
            webhookUrl: url,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
          });
        } else if (it.kind === "webhook") {
          result = await sendWebhook({
            url,
            secret,
            event: "alert.created",
            data: alert as unknown as Record<string, unknown>,
          });
        } else {
          return;
        }

        await prisma.tenantIntegration.update({
          where: { id: it.id },
          data: result.ok
            ? { lastSuccessAt: new Date(), lastError: null, lastErrorAt: null }
            : { lastErrorAt: new Date(), lastError: "non-2xx" },
        });
      } catch (err) {
        log.warn({ kind: it.kind, err }, "Integration dispatch failed");
      }
    }),
  );
}
