import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id, revoked: false },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return Response.json({
    sessions: tokens.map((t) => ({
      ...t,
      isCurrent: session.user.tokenId === t.id,
    })),
  });
}

const DeleteSchema = z.object({ tokenId: z.string() });

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const parsed = DeleteSchema.safeParse({ tokenId });
  if (!parsed.success) return Response.json({ error: "tokenId gerekli." }, { status: 400 });

  await prisma.apiToken.updateMany({
    where: { id: parsed.data.tokenId, userId: session.user.id },
    data: { revoked: true },
  });

  return Response.json({ ok: true });
}
