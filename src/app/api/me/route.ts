import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";
import { childLogger } from "@/lib/observability/logger";

export async function GET(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;

  const { user } = result;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, plan: true } },
    },
  });

  if (!dbUser) return Response.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  return Response.json({
    user: dbUser,
    authMethod: user.authMethod,
  });
}

const PatchSchema = z.object({
  name: z.string().min(1).max(80).nullable(),
});

export async function PATCH(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: body.data.name?.trim() || null },
    select: { id: true, email: true, name: true },
  });

  childLogger({ component: "me-update" }).info({ userId: user.id }, "Profile updated");
  return Response.json({ user: updated });
}
