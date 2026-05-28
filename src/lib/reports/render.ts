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
 *
 * Feature 5.3 — locale-aware: renderReportHtml + reportEmailSubject now
 * accept an optional locale param (default "tr" for back-compat).
 * Per-recipient locale persistence requires a future ScheduledReport
 * schema change; until then, callers pass tenant-derived locale.
 */

// Track FFFFF: implementation moved to @/lib/html/escape. Re-export keeps
// existing call sites + tests stable.
import { escapeHtml as _escapeHtml } from "@/lib/html/escape";
export const escHtml = _escapeHtml;

/**
 * Schedule frequency values used by scheduled-reports + watchlists UI.
 * Track IIIIIIIIII — extracted from inline z.enum in 2 API routes to
 * prevent drift (adding a new schedule in one site only breaks UI).
 */
export const SCHEDULE_VALUES = [
  "hourly",
  "daily_06",
  "daily_18",
  "weekly_monday",
  "monthly_first",
] as const;
export type ScheduleValue = (typeof SCHEDULE_VALUES)[number];

export const SCHEDULE_FILTER: Record<ScheduleValue, () => boolean> = {
  hourly: () => true,
  daily_06: () => new Date().getUTCHours() === 3,
  daily_18: () => new Date().getUTCHours() === 15,
  weekly_monday: () => new Date().getUTCDay() === 1 && new Date().getUTCHours() === 3,
  monthly_first: () => new Date().getUTCDate() === 1 && new Date().getUTCHours() === 3,
};

export function shouldFireSchedule(schedule: string): boolean {
  const fn = (SCHEDULE_FILTER as Record<string, (() => boolean) | undefined>)[schedule];
  return !!fn && fn();
}

type Locale = "tr" | "en" | string;

interface ReportCopy {
  brand: string;
  sqlLabel: (rowCount: number) => string;
  truncation: (totalRows: number) => string;
}

const COPY: Record<"tr" | "en", ReportCopy> = {
  tr: {
    brand: "ERPAIO RAPOR",
    sqlLabel: (n) => `SQL · ${n} satır`,
    truncation: (n) => `İlk 100 satır gösteriliyor (toplam ${n})`,
  },
  en: {
    brand: "ERPAIO REPORT",
    sqlLabel: (n) => `SQL · ${n} rows`,
    truncation: (n) => `Showing first 100 rows (of ${n} total)`,
  },
};

function copyFor(locale: Locale): ReportCopy {
  return locale === "en" ? COPY.en : COPY.tr;
}

/** Localized email subject prefix. */
export function reportEmailSubject(reportName: string, locale: Locale = "tr"): string {
  const prefix = locale === "en" ? "[ERPAIO Report]" : "[ERPAIO Rapor]";
  return `${prefix} ${reportName}`;
}

export function renderReportHtml(
  name: string,
  question: string,
  sql: string,
  rows: Record<string, unknown>[],
  locale: Locale = "tr",
): string {
  const c = copyFor(locale);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const head = cols
    .map(
      (col) =>
        `<th style="text-align:left;padding:8px 12px;color:#0F172A;border-bottom:2px solid #E5E7EB;font-weight:600">${escHtml(col)}</th>`,
    )
    .join("");
  const body = rows
    .slice(0, 100)
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F9FAFB"}">${cols
          .map(
            (col) =>
              `<td style="padding:6px 12px;color:#475569;border-bottom:1px solid #F3F4F6">${escHtml(String(r[col] ?? ""))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:8px;font-weight:700">${c.brand}</div>
      <h2 style="margin:0 0 6px;font-size:22px;color:#0F172A;font-weight:700;letter-spacing:-0.3px">${escHtml(name)}</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 20px">${escHtml(question)}</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px">
        <div style="color:#94A3B8;font-size:11px;margin-bottom:8px;font-weight:600;letter-spacing:0.5px">${c.sqlLabel(rows.length)}</div>
        <pre style="color:#0A0A0A;font-size:12px;margin:0;white-space:pre-wrap;font-family:ui-monospace,Menlo,Monaco,monospace">${escHtml(sql)}</pre>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length > 100 ? `<p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:12px">${c.truncation(rows.length)}</p>` : ""}
    </div>
  </body></html>`;
}
