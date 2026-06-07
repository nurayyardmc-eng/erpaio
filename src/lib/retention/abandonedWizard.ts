// Sprint P10 — retention hook for abandoned connection wizards.
//
// Pure helpers: the eligibility window math + the locale-aware help-email
// content. The cron route (api/cron/retention) owns the DB query, sending,
// and ActivityLog dedup. Keeping content + window pure makes them testable
// without Prisma/Resend.

export type RetentionLocale = "tr" | "en";

export interface RetentionWindow {
  /** Signed up no earlier than this (older = give up, not a fresh lead). */
  notBefore: Date;
  /** Signed up no later than this (younger = give them time to self-serve). */
  notAfter: Date;
}

export const MIN_AGE_HOURS = 24;
export const MAX_AGE_HOURS = 72;

/**
 * The "abandoned but still worth nudging" window: tenants created between
 * MAX_AGE_HOURS and MIN_AGE_HOURS ago.
 */
export function retentionWindow(now: Date = new Date()): RetentionWindow {
  const ms = now.getTime();
  return {
    notBefore: new Date(ms - MAX_AGE_HOURS * 60 * 60 * 1000),
    notAfter: new Date(ms - MIN_AGE_HOURS * 60 * 60 * 1000),
  };
}

export interface RetentionEmail {
  subject: string;
  html: string;
  text: string;
}

const CTA_URL = "https://erpaio.vercel.app/dashboard/connections";

const COPY: Record<RetentionLocale, {
  subject: string;
  greeting: string;
  body1: string;
  cta: string;
  body2: string;
  signoff: string;
  textReply: string;
}> = {
  tr: {
    subject: "ERPAIO kurulumunuzu birlikte tamamlayalım mı?",
    greeting: "Merhaba,",
    body1:
      "ERPAIO'ya kaydoldunuz ama ERP bağlantınızı henüz tamamlamadınız fark ettik. İlk bağlantı genelde 2 dakika sürüyor — ve tamamlandığında ERP verinize Türkçe soru sorup saniyeler içinde cevap almaya başlıyorsunuz.",
    cta: "Bağlantıyı Tamamla",
    body2:
      "Bağlantı salt-okunur, AES-256-GCM şifreli ve verileriniz saklanmaz — yalnızca sorgu anında işlenir. Hazır değilseniz, bağlanmadan örnek veriyle de deneyebilirsiniz.",
    signoff: "— ERPAIO Ekibi",
    textReply: "Sorularınız için bu e-postayı yanıtlamanız yeterli.",
  },
  en: {
    subject: "Let's finish setting up ERPAIO together",
    greeting: "Hi,",
    body1:
      "You signed up for ERPAIO but haven't connected your ERP yet. The first connection usually takes 2 minutes — and once it's done, you can ask your ERP questions in plain language and get answers in seconds.",
    cta: "Finish connecting",
    body2:
      "The connection is read-only, AES-256-GCM encrypted, and your data is never stored — it's processed only at query time. Not ready? You can also try it with sample data first.",
    signoff: "— The ERPAIO Team",
    textReply: "Just reply to this email with any questions.",
  },
};

export function buildRetentionEmail(locale: RetentionLocale = "tr"): RetentionEmail {
  const c = COPY[locale] ?? COPY.tr;
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
    <p style="margin:0 0 16px;font-size:15px">${c.greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">${c.body1}</p>
    <p style="margin:0 0 24px">
      <a href="${CTA_URL}" style="display:inline-block;background:#0A0A0A;color:#FAFAF8;text-decoration:none;border-radius:100px;padding:12px 24px;font-size:14px;font-weight:600">${c.cta} →</a>
    </p>
    <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748B">${c.body2}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748B">${c.textReply}</p>
    <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;border-top:1px solid #E5E7EB;padding-top:16px">${c.signoff}</p>
  </div>
</body></html>`;
  const text = [c.greeting, "", c.body1, "", `${c.cta}: ${CTA_URL}`, "", c.body2, "", c.textReply, "", c.signoff].join("\n");
  return { subject: c.subject, html, text };
}
