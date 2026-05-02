import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal("HESABIMI SİL"),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca tenant sahibi silebilir." }, { status: 403 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json({ error: "Onay metni 'HESABIMI SİL' olmalı." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return Response.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) return Response.json({ error: "Şifre yanlış." }, { status: 401 });

  const log = childLogger({ component: "tenant-delete", tenantId: session.user.tenantId });
  log.warn({ userId: session.user.id }, "Tenant deletion initiated (KVKK md. 7)");

  await prisma.tenant.delete({ where: { id: session.user.tenantId } });

  return Response.json({ ok: true, message: "Hesabınız silindi. Veriler kaskat edildi." });
}
