/**
 * Shared transactional email layout.
 *
 * Used by Stripe webhook lifecycle emails (subscription activated/cancelled,
 * trial_will_end). Trial-warning emails (lib/trial/warningEmail.ts) have a
 * slightly richer template with a tenant-name footer — kept separate so we
 * don't break that copy when this layout evolves.
 *
 * Track EEEEE — extracted to enforce one source of truth for the warm-grey
 * brand styling (border #E5E7EB, primary #0A0A0A, body #475569). Inline
 * styles only — most email clients strip <style> blocks.
 *
 * IMPORTANT: This template is INTENTIONALLY non-escaping. Callers are
 * trusted (server-side constants), inputs are static marketing copy. If
 * adding a code path with user-supplied content, escape it before passing
 * (see lib/reports/render.ts → escHtml for a reusable escaper).
 */
export function transactionalEmailHtml(
  title: string,
  body: string,
  ctaLabel: string,
  ctaUrl: string,
): string {
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
      <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">${title}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">${ctaLabel}</a>
    </div>
  </body></html>`;
}
