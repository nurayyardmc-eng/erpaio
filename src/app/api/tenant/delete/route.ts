import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";

const BodySchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal("HESABIMI SİL"),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);
  if (session.user.role !== "owner") {
    return localizedError(req, 403, { tr: "Yalnızca tenant sahibi silebilir.", en: "Only the tenant owner can delete." });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return localizedError(req, 400, { tr: "Onay metni 'HESABIMI SİL' olmalı.", en: "Confirmation must be 'HESABIMI SİL'." });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return localizedError(req, 404, { tr: "Kullanıcı bulunamadı.", en: "User not found." });

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) return localizedError(req, 401, { tr: "Şifre yanlış.", en: "Incorrect password." });

  const log = childLogger({ component: "tenant-delete", tenantId: session.user.tenantId });
  log.warn({ userId: session.user.id }, "Tenant deletion initiated (KVKK md. 7)");

  await prisma.tenant.delete({ where: { id: session.user.tenantId } });

  return Response.json({ ok: true, message: "Hesabınız silindi. Veriler kaskat edildi." });
}
