import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { verifyCronAuth } from "@/lib/cron/auth";
import { acquireCronLock, finalizeCronRun } from "@/lib/cron/lock";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/observability/requestId";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TrialEmailContent {
  subject: string;
  html: string;
}

/**
 * Trial sürecinde gönderilen email'ler:
 * - 7 gün kala: yarı yolda hatırlatma
 * - 2 gün kala: yaklaşan bitiş uyarısı
 * - 0 gün (bugün): son gün
 * - -1 gün (dün bitti): expired
 * - -3 gün: son şans / data export uyarısı
 */
function buildEmail(daysLeft: number, tenantName: string): TrialEmailContent | null {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";

  const wrap = (title: string, body: string, ctaLabel: string, ctaUrl: string) => ({
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

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req);

  const auth = await verifyCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: 401, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }

  const log = childLogger({ component: "cron-trial-warnings", requestId });

  const lock = await acquireCronLock("trial-warnings");
  if (!lock.ok) {
    log.warn({ existingRunId: lock.existingRunId }, "Skipping — another run is in progress");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "duplicate", existingRunId: lock.existingRunId },
      { status: 409, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  }
  const cronRunId = lock.cronRunId;

  const tenants = await prisma.tenant.findMany({
    where: {
      plan: "starter",
      trialEndsAt: { not: null },
      users: { some: {} },
    },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      users: {
        where: { role: "owner" },
        select: { email: true },
        take: 1,
      },
    },
  });

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60_000;

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    if (!tenant.trialEndsAt) continue;
    const owner = tenant.users[0];
    if (!owner?.email) {
      skipped++;
      continue;
    }

    const diffMs = tenant.trialEndsAt.getTime() - now;
    // Floor down for negative days (yesterday = -1, not 0)
    const daysLeft = Math.floor(diffMs / ONE_DAY);

    const email = buildEmail(daysLeft, tenant.name);
    if (!email) {
      skipped++;
      continue;
    }

    try {
      const res = await sendEmail({
        to: owner.email,
        subject: email.subject,
        html: email.html,
        tenantId: tenant.id,
      });
      if (res.ok) {
        sent++;
        log.info(
          { tenantId: tenant.id, daysLeft, to: owner.email, emailId: res.id },
          "Trial warning sent",
        );
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      log.error({ err, tenantId: tenant.id }, "Trial warning send failed");
      Sentry.captureException(err, {
        tags: { component: "cron-trial-warnings" },
        extra: { tenantId: tenant.id, daysLeft },
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info(
    { event: "cron_done", tenantsChecked: tenants.length, sent, skipped, errors, durationMs },
    "Trial warnings cron complete",
  );

  const finalStatus = errors === 0 ? "SUCCESS" : sent > 0 ? "PARTIAL_FAILURE" : "FAILED";
  await finalizeCronRun(cronRunId, finalStatus, {
    tenantsTotal: tenants.length,
    tenantsOk: sent + skipped,
    tenantsFail: errors,
  });

  return NextResponse.json(
    {
      ok: true,
      tenantsChecked: tenants.length,
      sent,
      skipped,
      errors,
      durationMs,
    },
    { headers: { [REQUEST_ID_HEADER]: requestId } },
  );
}
