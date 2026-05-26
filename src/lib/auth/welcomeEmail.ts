/**
 * Signup welcome email — body + verification CTA.
 *
 * Extracted (Track RRRRRR) from src/app/api/auth/signup/route.ts so the
 * template + escapeHtml usage can be tested without booting bcrypt/Prisma.
 * This email is the customer's first impression — regression here is
 * customer-visible.
 *
 * Brand tokens hardcoded (matches all other transactional emails — caller
 * is server-side template, email clients strip <style> blocks). User-supplied
 * fields (name, tenantName) are escaped; verifyUrl is trusted (built from
 * server-issued token).
 */
import { escapeHtml } from "@/lib/html/escape";
import { baseUrl as defaultBaseUrl } from "@/lib/url";

export function welcomeEmailHtml(
  name: string,
  tenantName: string,
  verifyUrl: string,
  baseUrl: string = defaultBaseUrl(),
): string {
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
      <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
      <h2 style="margin:0 0 16px;font-size:24px;color:#0F172A;font-weight:700;letter-spacing:-0.5px">Hoş geldiniz, ${escapeHtml(name)}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
        <strong style="color:#0F172A">${escapeHtml(tenantName)}</strong> hesabınız oluşturuldu. 14 gün ücretsiz Pro deneme başladı.
      </p>
      <div style="background:#FEF3C7;border:1px solid #F59E0B40;border-radius:10px;padding:20px;margin:0 0 24px">
        <div style="color:#92400E;font-size:11px;letter-spacing:1.5px;margin-bottom:8px;font-weight:700">EMAIL DOĞRULAMA</div>
        <p style="color:#475569;font-size:14px;margin:0 0 16px;line-height:1.5">Hesabınızı aktive etmek için aşağıdaki bağlantıya tıklayın (24 saat geçerli):</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
          Email&apos;i Doğrula
        </a>
      </div>
      <h3 style="font-size:15px;color:#0F172A;margin:32px 0 12px;font-weight:600">Başlangıç adımları</h3>
      <ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0">
        <li>ERP&apos;niz için read-only kullanıcı oluşturun</li>
        <li>Dashboard → ERP Bağlantıları → Yeni Bağlantı</li>
        <li>Şema 30 saniyede taranır</li>
        <li>Türkçe ilk sorularınızı yazın</li>
      </ol>
      <a href="${baseUrl}/login" style="display:inline-block;margin-top:32px;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
        Dashboard&apos;a git →
      </a>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">Sorular: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a></p>
    </div>
  </body></html>`;
}
