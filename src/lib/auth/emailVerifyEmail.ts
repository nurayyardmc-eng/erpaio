/**
 * Email verification (re-send) email template.
 *
 * Extracted (Track UUUUUU) from src/app/api/auth/send-verification/route.ts.
 * Used by the in-app "Resend verification email" flow when a user's
 * verifyAt timestamp is still null.
 */

export interface EmailVerifyEmail {
  subject: string;
  html: string;
}

export function emailVerificationEmail(verifyUrl: string): EmailVerifyEmail {
  return {
    subject: "ERPAIO email adresinizi doğrulayın",
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
        <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
        <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">Email Doğrulama</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
          Hesabınızı tam olarak aktive etmek için aşağıdaki bağlantıya tıklayın. Link 24 saat geçerlidir.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Email&apos;i Doğrula</a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu talebi siz yapmadıysanız emaili silebilirsiniz.</p>
      </div>
    </body></html>`,
  };
}
