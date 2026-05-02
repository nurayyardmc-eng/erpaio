import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateApiToken, hashApiToken } from "@/lib/auth/dual";
import { rateLimit } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  deviceName: z.string().min(1).max(80).optional(),
});

const LOGIN_LIMIT = { prefix: "mobile-login", max: 10, windowMs: 15 * 60_000 };

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const limit = await rateLimit(ip, LOGIN_LIMIT);
  if (!limit.success) {
    return Response.json(
      { error: "Çok fazla deneme. Lütfen bekleyin." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)) },
      },
    );
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { email, password, deviceName } = body.data;
  const log = childLogger({ component: "mobile-login", email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log.info({ event: "login_failed", reason: "no_user" }, "Login failed");
    return Response.json({ error: "Email veya şifre hatalı." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    log.info({ event: "login_failed", reason: "bad_password" }, "Login failed");
    return Response.json({ error: "Email veya şifre hatalı." }, { status: 401 });
  }

  const raw = generateApiToken();
  const tokenHash = hashApiToken(raw);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60_000);

  await prisma.apiToken.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash,
      name: deviceName ?? "mobile",
      expiresAt,
    },
  });

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
