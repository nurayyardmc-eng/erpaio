import { hashPassword } from "@/lib/auth/hashPassword";
import { sha256Hex } from "@/lib/crypto/hash";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { childLogger } from "@/lib/observability/logger";
import { jsonError, localizedError } from "@/lib/i18n/server";
import { parseJsonBody } from "@/lib/http/searchParams";
import { zPassword } from "@/lib/auth/schemas";

const BodySchema = z.object({
  token: z.string().min(8),
  password: zPassword(),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { token, password, name } = body;
  const tokenHash = sha256Hex(token);

  const inv = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
    return jsonError(req, "auth.invalidToken", 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: inv.email } });
  if (existing) {
    return localizedError(req, 409, {
      tr: "Bu email zaten kayıtlı.",
      en: "This email is already registered.",
    });
  }

  const passwordHash = await hashPassword(password);

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
