import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { queryERP } from "@/lib/db/connector";
import { sendEmail } from "@/lib/notifications/email";
import { sendPushToTenant } from "@/lib/notifications/push";
import { childLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = childLogger({ component: "cron-watchlists" });

function compare(op: string, a: number, b: number): boolean {
  switch (op) {
    case "lt": return a < b;
    case "lte": return a <= b;
    case "gt": return a > b;
    case "gte": return a >= b;
    case "eq": return a === b;
    default: return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = verifyCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const watchlists = await prisma.watchlist.findMany({
    where: { enabled: true },
    take: 500,
  });

  let triggered = 0;

  for (const w of watchlists) {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: {
          session: { tenantId: w.tenantId, userId: w.userId },
          role: "assistant",
          success: true,
          content: { contains: w.question.slice(0, 50) },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { sqlQuery: true },
      });

      const sql = messages[0]?.sqlQuery;
      if (!sql) continue;

      const rows = await queryERP(w.connectionId, sql);
      const firstRow = rows[0];
      if (!firstRow) continue;

      const firstNumeric = Object.values(firstRow).find((v) => typeof v === "number");
      if (typeof firstNumeric !== "number") continue;

      const hit = compare(w.thresholdOp, firstNumeric, w.thresholdVal);

      await prisma.watchlist.update({
        where: { id: w.id },
        data: { lastRunAt: new Date(), lastValue: firstNumeric, triggeredAt: hit ? new Date() : w.triggeredAt },
      });

      if (hit) {
        triggered++;
        const msg = `${w.name}: ${firstNumeric} ${w.thresholdOp} ${w.thresholdVal} ✓`;

        await prisma.alert.create({
          data: {
            tenantId: w.tenantId,
            type: "watchlist",
            severity: "high",
            title: `Watchlist tetiklendi: ${w.name}`,
            description: msg,
            module: "watchlist",
            evidence: { value: firstNumeric, threshold: w.thresholdVal, op: w.thresholdOp } as object,
          },
        });

        if (w.emailTo) {
          void sendEmail({
            to: w.emailTo,
            subject: `[ERPAIO WATCH] ${w.name}`,
            html: `<p>${msg}</p>`,
          });
        }

        void sendPushToTenant(w.tenantId, {
          title: `Watch: ${w.name}`,
          body: msg,
          data: { watchlistId: w.id },
        });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { component: "cron-watchlists", watchlistId: w.id } });
    }
  }

  log.info({ triggered, total: watchlists.length }, "Watchlist run completed");
  return NextResponse.json({ ok: true, triggered, total: watchlists.length });
}
