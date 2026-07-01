import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createMobileApiToken } from "@/lib/auth/createMobileApiToken";
import { verifyCode } from "@/lib/auth/totp";
import { consumeRecoveryCode, looksLikeRecoveryCode } from "@/lib/auth/recovery";
import { nextLockoutState } from "@/lib/auth/lockout";
import { recordActivity, activityContextFromRequest } from "@/lib/audit/activity";
import { rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { extractClientIp } from "@/lib/http/clientIp";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  totpCode: z.string().min(1).max(20).optional(),
  deviceName: z.string().min(1).max(80).optional(),
});

const LOGIN_LIMIT = { prefix: "mobile-login", max: 10, windowMs: 15 * 60_000 };

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = extractClientIp(req);
  const limit = await rateLimit(ip, LOGIN_LIMIT);
  // Retry-After header'ı korumak için rateLimited429 helper'i.
  if (!limit.success) return rateLimited429(req, limit);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { email, password, totpCode, deviceName } = body;
  const log = childLogger({ component: "mobile-login", email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log.info({ event: "login_failed", reason: "no_user" }, "Login failed");
    return jsonError(req, "auth.invalidCredentials", 401);
  }

  // Parity with web authorize(): honor the account lockout on mobile too.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    log.info({ event: "login_failed", reason: "locked" }, "Login failed");
    return jsonError(req, "auth.accountLocked", 403);
  }

  const actor = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    ...activityContextFromRequest(req),
  };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const state = nextLockoutState(user.failedLoginCount, Date.now());
    await prisma.user.update({ where: { id: user.id }, data: state });
    await recordActivity({ ...actor, action: "auth.login_failed" });
    if (state.lockedUntil) await recordActivity({ ...actor, action: "auth.locked" });
    log.info({ event: "login_failed", reason: "bad_password" }, "Login failed");
    return jsonError(req, "auth.invalidCredentials", 401);
  }

  // Parity with web authorize(): a user with MFA enabled must pass the second
  // factor on mobile too — otherwise the mobile path is a full MFA bypass.
  if (user.totpEnabled && user.totpSecretEnc) {
    const code = totpCode ?? "";
    const mfaOk = looksLikeRecoveryCode(code)
      ? await consumeRecoveryCode(user.id, code)
      : verifyCode(user.totpSecretEnc, code);
    if (!mfaOk) {
      const state = nextLockoutState(user.failedLoginCount, Date.now());
      await prisma.user.update({ where: { id: user.id }, data: state });
      await recordActivity({ ...actor, action: "auth.mfa_failed" });
      if (state.lockedUntil) await recordActivity({ ...actor, action: "auth.locked" });
      log.info({ event: "login_failed", reason: "mfa" }, "Login failed");
      return jsonError(req, "auth.mfaRequired", 401);
    }
  }

  // Successful auth — clear any accrued lockout state.
  if ((user.failedLoginCount ?? 0) > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  const { raw, expiresAt } = await createMobileApiToken(
    user.id,
    user.tenantId,
    deviceName ?? "mobile",
  );

  await recordActivity({ ...actor, action: "auth.login" });
  log.info({ event: "login_ok", userId: user.id }, "Mobile login");

  return Response.json({
    token: raw,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
}
