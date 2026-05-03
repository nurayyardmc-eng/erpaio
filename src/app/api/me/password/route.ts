import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const limit = await rateLimit(session.user.id, {
    prefix: "change-password",
    max: 5,
    windowMs: 60 * 60_000,
  });
  if (!limit.success) {
    return Response.json({ error: "Çok fazla deneme. 1 saat sonra deneyin." }, { status: 429 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return Response.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
  if (!valid) return Response.json({ error: "Mevcut şifre hatalı." }, { status: 400 });

  if (body.data.currentPassword === body.data.newPassword) {
    return Response.json({ error: "Yeni şifre mevcut şifre ile aynı olamaz." }, { status: 400 });
  }

  const newHash = await bcrypt.hash(body.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
  });

  childLogger({ component: "password-change" }).info({ userId: session.user.id }, "Password changed");
  return Response.json({ ok: true });
}
