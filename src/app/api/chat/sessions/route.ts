import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseQuery } from "@/lib/http/searchParams";

const QuerySchema = z.object({
  view: z.enum(["active", "archived"]).default("active"),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const q = parseQuery(req, QuerySchema);
  if (q instanceof Response) return q;

  const sessions = await prisma.chatSession.findMany({
    where: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      archivedAt: q.view === "archived" ? { not: null } : null,
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
