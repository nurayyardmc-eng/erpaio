import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { RATE_LIMITS, enforceUserRateLimit } from "@/lib/rateLimit";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { recordUserActivity } from "@/lib/audit/activity";
import { zPassword } from "@/lib/auth/schemas";
import {
  parseJsonBody,
  userNotFoundError,
  incorrectPasswordError,
} from "@/lib/http/searchParams";
import { verifyUserPassword } from "@/lib/auth/verifyUserPassword";

const BodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: zPassword(),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limited = await enforceUserRateLimit(req, session.user.id, RATE_LIMITS.PASSWORD_CHANGE);
  if (limited) return limited;

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const verify = await verifyUserPassword(session.user.id, body.currentPassword);
  if (verify === "not_found") return userNotFoundError(req);
  if (verify === "wrong") return incorrectPasswordError(req);

  if (body.currentPassword === body.newPassword) {
    return localizedError(req, 400, { tr: "Yeni şifre mevcut şifre ile aynı olamaz.", en: "New password cannot be the same as the current one." });
  }

  const newHash = await bcrypt.hash(body.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
  });

  childLogger({ component: "password-change" }).info({ userId: session.user.id }, "Password changed");

  await recordUserActivity(req, session, {
    action: "password.change",
  });

  return Response.json({ ok: true });
}
