import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/hash";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { sendEmail } from "@/lib/notifications/email";
import { childLogger } from "@/lib/observability/logger";
import { recordConsent, consentContextFromRequest } from "@/lib/auth/consent";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { slugify } from "@/lib/auth/slugify";
import { welcomeEmailHtml } from "@/lib/auth/welcomeEmail";

import { extractClientIp } from "@/lib/http/clientIp";
import { zPassword, zEmail } from "@/lib/auth/schemas";
import { baseUrl } from "@/lib/url";
import { daysFromNow } from "@/lib/time/units";
const BodySchema = z.object({
  email: zEmail(),
  password: zPassword(),
  name: z.string().min(1).max(80).optional(),
  tenantName: z.string().min(1).max(120),
  // KVKK/Privacy/Terms onayı — frontend signup formundan gelir
  acceptedTerms: z.boolean().refine((v) => v === true, "Kullanım koşulları onayı gerekli."),
  acceptedPrivacy: z.boolean().refine((v) => v === true, "KVKK aydınlatma metni onayı gerekli."),
  documentVer: z.string().max(20).optional(),
});

// Email enumeration brute force koruması — IP başına saatte 3 deneme
const SIGNUP_LIMIT = { prefix: "signup", max: 3, windowMs: 60 * 60_000 };

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, SIGNUP_LIMIT);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const parsedBody = await parseJsonBody(req, BodySchema);
  if (parsedBody instanceof Response) return parsedBody;

  const { email, password, name, tenantName } = parsedBody;
  const log = childLogger({ component: "signup", email });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError(req, "auth.emailTaken", 409);
  }

  let slug = slugify(tenantName);
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.tenant.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${slugify(tenantName)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const trialEndsAt = daysFromNow(14);
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

  // KVKK/Privacy/Terms onayını append-only consent log'a yaz (md. 5 + md. 7).
  const { ipAddress, userAgent } = consentContextFromRequest(req);
  const userId = tenant.users[0].id;
  const docVer = parsedBody.documentVer ?? "v1";
  await Promise.all([
    recordConsent({
      userId,
      tenantId: tenant.id,
      email,
      consentType: "kvkk_signup",
      action: "granted",
      documentVer: docVer,
      ipAddress,
      userAgent,
      context: "signup",
    }),
    recordConsent({
      userId,
      tenantId: tenant.id,
      email,
      consentType: "terms",
      action: "granted",
      documentVer: docVer,
      ipAddress,
      userAgent,
      context: "signup",
    }),
    recordConsent({
      userId,
      tenantId: tenant.id,
      email,
      consentType: "privacy",
      action: "granted",
      documentVer: docVer,
      ipAddress,
      userAgent,
      context: "signup",
    }),
  ]);

  const verifyToken = randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(verifyToken);
  await prisma.emailVerificationToken.create({
    data: {
      userId: tenant.users[0].id,
      tokenHash,
      expiresAt: daysFromNow(1),
    },
  });

  const verifyUrl = `${baseUrl()}/verify-email?token=${verifyToken}`;

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

// welcomeEmailHtml + escapeHtml moved to @/lib/auth/welcomeEmail (Track RRRRRR).
