/**
 * Scheduled-report HTML renderer + schedule predicate.
 *
 * Extracted (Track YYYY) from src/app/api/cron/scheduled-reports/route.ts
 * so the HTML template + esc() XSS guard + schedule matchers can be
 * unit-tested without booting Prisma. esc() is a security boundary —
 * a regression here means tenant data lands raw in customer inboxes.
 *
 * Schedule predicates are evaluated against the CURRENT process time
 * (UTC). Tests use vi.useFakeTimers to make them deterministic.
 */

// Track FFFFF: implementation moved to @/lib/html/escape. Re-export keeps
// existing call sites + tests stable.
import { escapeHtml as _escapeHtml } from "@/lib/html/escape";
export const escHtml = _escapeHtml;

export const SCHEDULE_FILTER: Record<string, () => boolean> = {
  hourly: () => true,
  daily_06: () => new Date().getUTCHours() === 3,
  daily_18: () => new Date().getUTCHours() === 15,
  weekly_monday: () => new Date().getUTCDay() === 1 && new Date().getUTCHours() === 3,
  monthly_first: () => new Date().getUTCDate() === 1 && new Date().getUTCHours() === 3,
};

export function shouldFireSchedule(schedule: string): boolean {
  const fn = SCHEDULE_FILTER[schedule];
  return !!fn && fn();
}

export function renderReportHtml(
  name: string,
  question: string,
  sql: string,
  rows: Record<string, unknown>[],
): string {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const head = cols
    .map(
      (c) =>
        `<th style="text-align:left;padding:8px 12px;color:#0F172A;border-bottom:2px solid #E5E7EB;font-weight:600">${escHtml(c)}</th>`,
    )
    .join("");
  const body = rows
    .slice(0, 100)
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F9FAFB"}">${cols
          .map(
            (c) =>
              `<td style="padding:6px 12px;color:#475569;border-bottom:1px solid #F3F4F6">${escHtml(String(r[c] ?? ""))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:8px;font-weight:700">ERPAIO RAPOR</div>
      <h2 style="margin:0 0 6px;font-size:22px;color:#0F172A;font-weight:700;letter-spacing:-0.3px">${escHtml(name)}</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 20px">${escHtml(question)}</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px">
        <div style="color:#94A3B8;font-size:11px;margin-bottom:8px;font-weight:600;letter-spacing:0.5px">SQL · ${rows.length} satır</div>
        <pre style="color:#0A0A0A;font-size:12px;margin:0;white-space:pre-wrap;font-family:ui-monospace,Menlo,Monaco,monospace">${escHtml(sql)}</pre>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length > 100 ? `<p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:12px">İlk 100 satır gösteriliyor (toplam ${rows.length})</p>` : ""}
    </div>
  </body></html>`;
}
