// Pure helpers for the trial-warnings cron — split from the route handler
// so daysLeft math + email-content branching can be unit-tested without
// booting Prisma / NextRequest. Imported by:
//   src/app/api/cron/trial-warnings/route.ts

import { baseUrl as defaultBaseUrl } from "@/lib/url";
import { ONE_DAY_MS } from "@/lib/time/units";

export interface TrialEmailContent {
  subject: string;
  html: string;
}

/**
 * Days remaining on trial relative to `now`. Negative numbers mean the
 * trial has already expired (−1 = ended yesterday). Math.floor preserves
 * the "yesterday-is-minus-one" semantics required by the email branches.
 */
export function calcTrialDaysLeft(trialEndsAt: Date, now: number = Date.now()): number {
  const diffMs = trialEndsAt.getTime() - now;
  return Math.floor(diffMs / ONE_DAY_MS);
}

/**
 * Email content for a particular daysLeft signal. Returns `null` for days
 * that DON'T trigger an email (anything outside {7, 2, 0, -1, -7}).
 *
 * Why explicit branches rather than a table: each touch-point has unique
 * copy + CTA destination (dashboard vs pricing). A lookup table would
 * obscure that.
 */
export function buildTrialWarningEmail(
  daysLeft: number,
  tenantName: string,
  baseUrl: string = defaultBaseUrl(),
): TrialEmailContent | null {
  const wrap = (title: string, body: string, ctaLabel: string, ctaUrl: string): TrialEmailContent => ({
    subject: `ERPAIO — ${title}`,
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9FAFB;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px">
        <div style="color:#0A0A0A;font-size:11px;letter-spacing:3px;margin-bottom:16px;font-weight:700">ERPAIO</div>
        <h2 style="font-size:22px;margin:0 0 12px;font-weight:700;color:#0F172A;letter-spacing:-0.5px">${title}</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
        <a href="${ctaUrl}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">${ctaLabel}</a>
        <p style="color:#94A3B8;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:20px">
          <strong style="color:#0F172A">${tenantName}</strong> — bu email aboneliğiniz devam ettiği sürece tarafınıza
          gönderilen kullanım bildirimidir. Soru: <a href="mailto:support@erpaio.com" style="color:#0A0A0A">support@erpaio.com</a>
        </p>
      </div>
    </body></html>`,
  });

  if (daysLeft === 7) {
    return wrap(
      "Pro denemenizin yarısına geldiniz",
      `Pro deneme sürenizin 7 günü kaldı. Şu ana kadar nasıl gidiyor? Henüz ERP bağlamadıysanız hemen başlamak için tek tıklama yeterli.`,
      "Dashboard'a Git →",
      `${baseUrl}/dashboard`,
    );
  }
  if (daysLeft === 2) {
    return wrap(
      "Pro denemenizin bitmesine 2 gün kaldı",
      `Pro avantajlarınızı kaybetmemek için plan seçin. Pro: aylık 2M token, 10 ERP bağlantısı, sınırsız watchlist.`,
      "Planı Seç →",
      `${baseUrl}/pricing`,
    );
  }
  if (daysLeft === 0) {
    return wrap(
      "Bugün Pro denemenizin son günü",
      `Bugün sonunda hesabınız Starter plana düşer. Verileriniz silinmez ama Pro özellikleri kullanılamaz.`,
      "Pro'ya Devam Et →",
      `${baseUrl}/pricing`,
    );
  }
  if (daysLeft === -1) {
    return wrap(
      "Pro denemeniz dün sona erdi",
      `Hesabınız Starter plana düştü. Sınırsız sohbet + bağlantı için Pro'ya yükseltebilirsiniz. Verileriniz korunuyor.`,
      "Pro'ya Yükselt →",
      `${baseUrl}/pricing`,
    );
  }
  if (daysLeft === -7) {
    return wrap(
      "Bir hafta önce Pro deneme sona erdi",
      `Hâlâ buradayız! Pro'ya yükseltmek isterseniz indirimli yıllık plan mevcut. Veya hesabınızı tamamen kapatmak isterseniz Ayarlar > Tehlikeli Bölge.`,
      "Planları İncele →",
      `${baseUrl}/pricing`,
    );
  }
  return null;
}
