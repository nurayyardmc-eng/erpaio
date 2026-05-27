import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createMobileApiToken } from "@/lib/auth/createMobileApiToken";
import { rateLimit, rateLimited429 } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { extractClientIp } from "@/lib/http/clientIp";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
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

  const { email, password, deviceName } = body;
  const log = childLogger({ component: "mobile-login", email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log.info({ event: "login_failed", reason: "no_user" }, "Login failed");
    return jsonError(req, "auth.invalidCredentials", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    log.info({ event: "login_failed", reason: "bad_password" }, "Login failed");
    return jsonError(req, "auth.invalidCredentials", 401);
  }

  const { raw, expiresAt } = await createMobileApiToken(
    user.id,
    user.tenantId,
    deviceName ?? "mobile",
  );

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
