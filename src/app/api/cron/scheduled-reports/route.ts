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
      }).catch((updateErr) => {
        log.error({ err: updateErr, reportId: r.id }, "Failed to record lastError on scheduled report");
      });
      Sentry.captureException(err, { tags: { component: "cron-reports", reportId: r.id } });
    }
  }

  return NextResponse.json({ ok: true, executed, failed, total: reports.length });
}

function renderReportHtml(name: string, question: string, sql: string, rows: Record<string, unknown>[]): string {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const head = cols.map((c) => `<th style="text-align:left;padding:8px 12px;color:#0F172A;border-bottom:2px solid #E5E7EB;font-weight:600">${esc(c)}</th>`).join("");
  const body = rows.slice(0, 100).map((r, i) =>
    `<tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F9FAFB"}">${cols.map((c) => `<td style="padding:6px 12px;color:#475569;border-bottom:1px solid #F3F4F6">${esc(String(r[c] ?? ""))}</td>`).join("")}</tr>`,
  ).join("");

  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:8px;font-weight:700">ERPAIO RAPOR</div>
      <h2 style="margin:0 0 6px;font-size:22px;color:#0F172A;font-weight:700;letter-spacing:-0.3px">${esc(name)}</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 20px">${esc(question)}</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px">
        <div style="color:#94A3B8;font-size:11px;margin-bottom:8px;font-weight:600;letter-spacing:0.5px">SQL · ${rows.length} satır</div>
        <pre style="color:#0A0A0A;font-size:12px;margin:0;white-space:pre-wrap;font-family:ui-monospace,Menlo,Monaco,monospace">${esc(sql)}</pre>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length > 100 ? `<p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:12px">İlk 100 satır gösteriliyor (toplam ${rows.length})</p>` : ""}
    </div>
  </body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
