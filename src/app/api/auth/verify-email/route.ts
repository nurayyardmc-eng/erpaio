import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: "Geçersiz token." }, { status: 400 });

  const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return Response.json({ error: "Link geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  childLogger({ component: "verify-email" }).info({ userId: row.userId }, "Email verified");
  return Response.json({ ok: true });
}
