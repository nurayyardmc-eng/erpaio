import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "active"; // active | archived

  const sessions = await prisma.chatSession.findMany({
    where: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      archivedAt: view === "archived" ? { not: null } : null,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      pinned: true,
      archivedAt: true,
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
      pinned: s.pinned,
      archivedAt: s.archivedAt,
      createdAt: s.createdAt,
    })),
  );
}
