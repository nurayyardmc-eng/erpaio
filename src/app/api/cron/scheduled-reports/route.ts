import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { queryERP } from "@/lib/db/connector";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = childLogger({ component: "cron-reports" });

const SCHEDULE_FILTER: Record<string, () => boolean> = {
  hourly: () => true,
  daily_06: () => new Date().getUTCHours() === 3,
  daily_18: () => new Date().getUTCHours() === 15,
  weekly_monday: () => new Date().getUTCDay() === 1 && new Date().getUTCHours() === 3,
  monthly_first: () => new Date().getUTCDate() === 1 && new Date().getUTCHours() === 3,
};

export async function GET(req: NextRequest) {
  const auth = verifyCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const reports = await prisma.scheduledReport.findMany({
    where: { enabled: true },
    take: 200,
  });

  let executed = 0;
  let failed = 0;

  for (const r of reports) {
    const should = SCHEDULE_FILTER[r.schedule];
    if (!should || !should()) continue;

    try {
      const messages = await prisma.chatMessage.findMany({
        where: {
          session: { tenantId: r.tenantId, userId: r.userId },
          role: "assistant",
          success: true,
          content: { contains: r.question.slice(0, 50) },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { sqlQuery: true },
      });

      const sql = messages[0]?.sqlQuery;
      if (!sql) {
        log.info({ reportId: r.id }, "No cached SQL — manual run needed");
        continue;
      }

      const rows = await queryERP(r.connectionId, sql);
      const html = renderReportHtml(r.name, r.question, sql, rows);

      await sendEmail({
        to: r.emailTo,
        subject: `[ERPAIO Rapor] ${r.name}`,
        html,
      });

      await prisma.scheduledReport.update({
        where: { id: r.id },
        data: { lastRunAt: new Date(), lastError: null },
      });
      executed++;
      log.info({ reportId: r.id, rows: rows.length }, "Scheduled report sent");
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.scheduledReport.update({
        where: { id: r.id },
        data: { lastError: msg.slice(0, 500) },
      }).catch(() => {});
      Sentry.captureException(err, { tags: { component: "cron-reports", reportId: r.id } });
    }
  }

  return NextResponse.json({ ok: true, executed, failed, total: reports.length });
}

function renderReportHtml(name: string, question: string, sql: string, rows: Record<string, unknown>[]): string {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const head = cols.map((c) => `<th style="text-align:left;padding:6px 10px;color:#00E5FF;border-bottom:1px solid #131A26">${esc(c)}</th>`).join("");
  const body = rows.slice(0, 100).map((r) =>
    `<tr>${cols.map((c) => `<td style="padding:4px 10px;color:#9AA5B4">${esc(String(r[c] ?? ""))}</td>`).join("")}</tr>`,
  ).join("");

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
    <div style="max-width:760px;margin:0 auto">
      <div style="color:#00E5FF;font-size:11px;letter-spacing:3px;margin-bottom:8px">ERPAIO RAPOR</div>
      <h2 style="margin:0 0 4px;font-size:18px">${esc(name)}</h2>
      <p style="color:#9AA5B4;font-size:12px;margin:0 0 16px">${esc(question)}</p>
      <div style="background:#0C1018;border:1px solid #131A26;border-radius:8px;padding:16px">
        <div style="color:#3A4558;font-size:10px;margin-bottom:6px">SQL · ${rows.length} satır</div>
        <pre style="color:#8EC8E8;font-size:10px;margin:0;white-space:pre-wrap">${esc(sql)}</pre>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:11px">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length > 100 ? `<p style="color:#3A4558;font-size:10px;text-align:center;margin-top:8px">İlk 100 satır gösteriliyor (toplam ${rows.length})</p>` : ""}
    </div>
  </body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
