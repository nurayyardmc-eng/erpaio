import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";

const BodySchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { token, password, name } = body.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const inv = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
    return Response.json({ error: "Davet geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: inv.email } });
  if (existing) {
    return Response.json({ error: "Bu email zaten kayıtlı." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        tenantId: inv.tenantId,
        email: inv.email,
        passwordHash,
        name: name ?? null,
        role: inv.role,
      },
    });
    await tx.invitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });
    return u;
  });

  childLogger({ component: "invite-accept" }).info(
    { userId: user.id, tenantId: inv.tenantId, role: inv.role },
    "Invitation accepted",
  );

  return Response.json({ ok: true, email: user.email });
}
