import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const sessions = await prisma.chatSession.findMany({
    where: { tenantId: session.user.tenantId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { messages: true } },
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return Response.json(
    sessions.map((s) => ({
      id: s.id,
      title: s.title ?? s.messages[0]?.content?.slice(0, 60) ?? "Yeni sohbet",
      messageCount: s._count.messages,
      createdAt: s.createdAt,
    })),
  );
}
