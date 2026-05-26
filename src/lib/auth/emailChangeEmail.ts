/**
 * Email-change confirmation email (TR + EN variants).
 *
 * Extracted (Track SSSSSS) from src/app/api/me/email/request-change/route.ts.
 * Locale-conditional bodyHtml — if either copy regresses, user can't
 * confirm new email (locked out of address change flow).
 */

export interface EmailChangeConfirmEmail {
  subject: string;
  html: string;
}

export function emailChangeConfirmEmail(
  locale: "en" | "tr" | string,
  verifyUrl: string,
): EmailChangeConfirmEmail {
  if (locale === "en") {
    return {
      subject: "Confirm your new ERPAIO email",
      html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
          <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
          <h2 style="font-size:22px;margin:0 0 12px;font-weight:700">Confirm new email</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
            Click the button below to confirm this is your new email address for ERPAIO. The link is valid for 24 hours.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Confirm Email Change</a>
          <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">If you didn't request this change, ignore this email. Your current email will stay active.</p>
        </div>
      </body></html>`,
    };
  }
  // Default TR
  return {
    subject: "Yeni ERPAIO email adresinizi onaylayın",
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
          <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
          <h2 style="font-size:22px;margin:0 0 12px;font-weight:700">Yeni email adresinizi onaylayın</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
            Aşağıdaki butona tıklayarak ERPAIO hesabınız için bu yeni email adresini onaylayın. Link 24 saat geçerli.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Email Değişikliğini Onayla</a>
          <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu değişikliği siz talep etmediyseniz emaili silebilirsiniz. Mevcut email'iniz aktif kalır.</p>
        </div>
      </body></html>`,
  };
}
