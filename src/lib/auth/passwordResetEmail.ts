/**
 * Password reset email template (TR only — auth flows always TR in product).
 *
 * Extracted (Track TTTTTT) from src/app/api/auth/forgot-password/route.ts.
 * Customer-facing recovery flow — copy regression silently breaks reset
 * link comprehension.
 */

export interface PasswordResetEmail {
  subject: string;
  html: string;
}

export function passwordResetEmail(resetUrl: string): PasswordResetEmail {
  return {
    subject: "ERPAIO — Şifre sıfırlama linki",
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
        <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
        <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">Şifre Sıfırlama</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">Aşağıdaki bağlantıya tıklayarak yeni bir şifre belirleyin. Link 1 saat geçerlidir.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Şifreyi sıfırla</a>
        <p style="color:#94A3B8;font-size:12px;line-height:1.5;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Bu talebi siz yapmadıysanız bu emaili silebilirsiniz, hesabınız güvende.</p>
      </div>
    </body></html>`,
  };
}
