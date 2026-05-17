import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonError } from "@/lib/i18n/server";

const BodySchema = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  // Brute force koruması: IP başına saatte 10 deneme
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(ip, RATE_LIMITS.VERIFY_EMAIL);
  if (!limit.success) return jsonError(req, "api.rateLimited", 429);

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return jsonError(req, "auth.invalidToken", 400);

  const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  childLogger({ component: "verify-email" }).info({ userId: row.userId }, "Email verified");
  return Response.json({ ok: true });
}
