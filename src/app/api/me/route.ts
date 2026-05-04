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
      avatarBase64: true,
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
  name: z.string().min(1).max(80).nullable().optional(),
  avatarBase64: z.string().max(500_000).nullable().optional(), // ~370KB base64 max
});

export async function PATCH(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const data: { name?: string | null; avatarBase64?: string | null } = {};
  if (body.data.name !== undefined) data.name = body.data.name?.trim() || null;
  if (body.data.avatarBase64 !== undefined) {
    if (body.data.avatarBase64 && !body.data.avatarBase64.startsWith("data:image/")) {
      return Response.json({ error: "Geçersiz görsel formatı." }, { status: 400 });
    }
    data.avatarBase64 = body.data.avatarBase64;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, avatarBase64: true },
  });

  childLogger({ component: "me-update" }).info({ userId: user.id }, "Profile updated");
  return Response.json({ user: updated });
}
