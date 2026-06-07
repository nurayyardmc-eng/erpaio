// Sprint G.2 — demo request (lead-gen) intake endpoint.
//
// Pre-signup, so there is NO session/tenant. Identified + rate-limited by
// client IP. Validates with zod, logs the lead via childLogger (so it's
// observable in Vercel/Sentry immediately), and returns ok. CRM / email
// wiring is a future sprint — the shape here is the integration seam.

import { z } from "zod";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";
import { extractClientIp } from "@/lib/http/clientIp";
import { parseJsonBody } from "@/lib/http/searchParams";
import { childLogger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/notifications/email";
import { buildLeadEmail } from "@/lib/leads/leadEmail";

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  erp: z.enum(["nebim", "sap", "oracle", "dynamics", "logo", "mikro", "other"]),
  locale: z.enum(["en", "tr", "ar"]).optional(),
});

// Sales/CRM inbox(es) leads are delivered to. Comma-separated, same
// convention as SYSADMIN_NOTIFY_EMAIL. Unset → delivery is skipped (the
// lead is still logged), so the form keeps working in dev/preview.
function leadRecipients(): string[] {
  return (process.env.LEAD_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, RATE_LIMITS.DEMO_REQUEST);
  if (!limit.success) return rateLimited429(req, limit);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const log = childLogger({ component: "demo-request" });
  // Email is PII — log only the domain so the funnel is measurable without
  // storing the full address in app logs.
  const emailDomain = body.email.split("@")[1] ?? "unknown";
  log.info(
    { erp: body.erp, locale: body.locale ?? "en", emailDomain },
    "Demo request received",
  );

  // P5 — production lead delivery. Email the sales inbox with replyTo set
  // to the prospect so sales can answer directly. Delivery failure (or no
  // configured recipient) must NOT fail the user's submission — the lead
  // is already logged and Sentry-captured inside sendEmail on error.
  const recipients = leadRecipients();
  if (recipients.length > 0) {
    const mail = buildLeadEmail(body);
    const sent = await sendEmail({
      to: recipients,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: body.email,
    });
    if (!sent.ok) {
      log.warn({ emailDomain }, "Lead email delivery failed; lead is logged only");
    }
  } else {
    log.warn({}, "LEAD_NOTIFY_EMAIL not set; lead logged but not delivered");
  }

  return Response.json({ ok: true });
}
