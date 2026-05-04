import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { token, password } = body.data;
  const log = childLogger({ component: "reset-password" });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return Response.json({ error: "Link geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.apiToken.updateMany({ where: { userId: row.userId, revoked: false }, data: { revoked: true } }),
  ]);

  log.info({ userId: row.userId }, "Password reset");
  return Response.json({ ok: true });
}
