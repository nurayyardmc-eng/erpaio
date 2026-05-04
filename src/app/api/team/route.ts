import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

const PatchSchema = z.object({
  userId: z.string(),
  role: z.enum(["viewer", "admin", "owner"]),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, email: true, name: true, role: true, createdAt: true, totpEnabled: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { tenantId: session.user.tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return Response.json({ users, invitations });
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca tenant sahibi rol değiştirebilir." }, { status: 403 });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  if (body.data.role === "owner" && body.data.userId !== session.user.id) {
    const owners = await prisma.user.count({
      where: { tenantId: session.user.tenantId, role: "owner" },
    });
    if (owners >= 1) {
      return Response.json({ error: "Owner devri için ayrı endpoint kullanın (henüz yok)." }, { status: 400 });
    }
  }

  await prisma.user.updateMany({
    where: { id: body.data.userId, tenantId: session.user.tenantId },
    data: { role: body.data.role },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const invitationId = searchParams.get("invitationId");

  if (userId) {
    if (userId === session.user.id) {
      return Response.json({ error: "Kendi hesabınızı silmek için /dashboard/settings → Hesabı sil." }, { status: 400 });
    }
    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId: session.user.tenantId },
      select: { role: true },
    });
    if (target?.role === "owner") {
      return Response.json({ error: "Owner silinemez." }, { status: 400 });
    }
    await prisma.user.deleteMany({ where: { id: userId, tenantId: session.user.tenantId } });
  } else if (invitationId) {
    await prisma.invitation.deleteMany({ where: { id: invitationId, tenantId: session.user.tenantId } });
  } else {
    return Response.json({ error: "userId veya invitationId gerekli." }, { status: 400 });
  }

  return Response.json({ ok: true });
}
