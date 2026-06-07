// Sprint P5 — lead notification email builder.
//
// Pure: turns a validated demo-request payload into { subject, html, text }
// for sendEmail(). No I/O, so it's unit-testable without Resend. The route
// owns delivery + env resolution; this owns presentation + escaping.
//
// SECURITY: name/email/erp originate from an unauthenticated public form,
// so every interpolated value is HTML-escaped to prevent injection into
// the notification email rendered in the sales inbox.

import { escapeHtml } from "@/lib/html/escape";

export type LeadErp = "nebim" | "sap" | "oracle" | "dynamics" | "logo" | "mikro" | "other";

export interface LeadPayload {
  name: string;
  email: string;
  erp: LeadErp;
  locale?: "en" | "tr" | "ar";
}

const ERP_LABEL: Record<LeadErp, string> = {
  nebim: "Nebim V3",
  sap: "SAP S/4HANA",
  oracle: "Oracle Fusion",
  dynamics: "Dynamics 365",
  logo: "Logo",
  mikro: "Mikro",
  other: "Other / Diğer",
};

export function erpLabel(erp: LeadErp): string {
  return ERP_LABEL[erp] ?? erp;
}

export interface BuiltLeadEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildLeadEmail(payload: LeadPayload): BuiltLeadEmail {
  const erp = erpLabel(payload.erp);
  const locale = payload.locale ?? "en";
  const subject = `New demo request — ${payload.name} (${erp})`;

  const rows: Array<[string, string]> = [
    ["Name", payload.name],
    ["Email", payload.email],
    ["ERP", erp],
    ["Locale", locale],
  ];

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;color:#94A3B8;font-size:13px;white-space:nowrap">${escapeHtml(k)}</td>` +
        `<td style="padding:8px 12px;color:#0F172A;font-size:14px;font-weight:500">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px;border-left:4px solid #0A0A0A">
    <div style="display:inline-block;background:#F3F4F6;color:#0A0A0A;font-size:11px;letter-spacing:1.5px;padding:4px 10px;border-radius:999px;margin-bottom:16px;font-weight:700">DEMO REQUEST</div>
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:-0.3px">New enterprise lead</h2>
    <table style="border-collapse:collapse;width:100%">${rowsHtml}</table>
    <p style="color:#94A3B8;font-size:12px;margin-top:28px;border-top:1px solid #E5E7EB;padding-top:16px">Reply directly to this email to reach the prospect — ERPAIO</p>
  </div>
</body></html>`;

  const text = [
    "New demo request",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Reply directly to this email to reach the prospect.",
  ].join("\n");

  return { subject, html, text };
}
