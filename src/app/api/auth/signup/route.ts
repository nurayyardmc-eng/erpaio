import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).optional(),
  tenantName: z.string().min(1).max(120),
});

const SIGNUP_LIMIT = { prefix: "signup", max: 5, windowMs: 60 * 60_000 };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `t-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(ip, SIGNUP_LIMIT);
  if (!limit.success) {
    return Response.json(
      { error: "Çok fazla kayıt denemesi. 1 saat sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { email, password, name, tenantName } = body.data;
  const log = childLogger({ component: "signup", email });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Bu email zaten kayıtlı." }, { status: 409 });
  }

  let slug = slugify(tenantName);
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.tenant.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${slugify(tenantName)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60_000);
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug,
      plan: "starter",
      trialEndsAt,
      users: {
        create: {
          email,
          passwordHash,
          name: name ?? null,
          role: "owner",
        },
      },
    },
    include: { users: true },
  });

  log.info({ tenantId: tenant.id, userId: tenant.users[0].id }, "Signup completed");

  const verifyToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(verifyToken).digest("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: tenant.users[0].id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";
  const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;

  void sendEmail({
    to: email,
    subject: "ERPAIO'ya hoş geldiniz",
    html: welcomeEmailHtml(name ?? email, tenantName, verifyUrl),
  });

  return Response.json({
    ok: true,
    tenant: { id: tenant.id, slug: tenant.slug, trialEndsAt: tenant.trialEndsAt },
    user: { id: tenant.users[0].id, email },
  });
}

function welcomeEmailHtml(name: string, tenantName: string, verifyUrl: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
    <div style="max-width:560px;margin:0 auto;background:#0C1018;border:1px solid #131A26;border-radius:12px;padding:32px">
      <div style="color:#00E5FF;font-size:11px;letter-spacing:3px;margin-bottom:8px">ERPAIO</div>
      <h2 style="margin:0 0 16px;font-size:22px;color:#0F172A">Hoş geldiniz ${escapeHtml(name)}</h2>
      <p style="color:#9AA5B4;font-size:13px;line-height:1.7">
        <strong style="color:#E8EDF5">${escapeHtml(tenantName)}</strong> hesabın oluşturuldu.
        14 gün ücretsiz Pro deneme süren başladı.
      </p>
      <div style="background:#FF950018;border:1px solid #FF950040;border-radius:8px;padding:16px;margin:20px 0">
        <div style="color:#FF9500;font-size:11px;letter-spacing:2px;margin-bottom:6px">EMAIL DOĞRULAMA</div>
        <p style="color:#9AA5B4;font-size:12px;margin:0 0 12px;line-height:1.6">Hesabını aktive etmek için aşağıdaki bağlantıya tıkla (24 saat geçerli):</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#FF9500;color:#07090F;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px">
          Email&apos;i Doğrula
        </a>
      </div>
      <h3 style="font-size:13px;color:#00E5FF;margin-top:24px">Başlangıç adımları</h3>
      <ol style="color:#9AA5B4;font-size:12px;line-height:1.8;padding-left:20px">
        <li>ERP&apos;niz için read-only user oluşturun</li>
        <li>Dashboard → ERP Bağlantıları → Yeni Bağlantı</li>
        <li>Şema otomatik taranır (30 saniye)</li>
        <li>Türkçe ilk sorularınızı yazın!</li>
      </ol>
      <a href="https://erpaio.vercel.app/login" style="display:inline-block;margin-top:24px;background:#00E5FF;color:#07090F;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Dashboard'a git →
      </a>
      <p style="color:#3A4558;font-size:11px;margin-top:32px">Sorular: support@erpaio.com</p>
    </div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
