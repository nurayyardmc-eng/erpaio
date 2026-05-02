import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { inferForeignKeys } from "@/lib/erpProfiles/foreignKeyInference";
import { findCustomItems } from "@/lib/erpProfiles/customColumnFlag";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");

  const inferredFks = await inferForeignKeys(session.user.tenantId);

  let customs: Awaited<ReturnType<typeof findCustomItems>> = [];
  if (connectionId) {
    const conn = await prisma.erpConnection.findFirst({
      where: { id: connectionId, tenantId: session.user.tenantId, status: "active" },
      select: { id: true, erpProfile: true, erpType: true },
    });
    if (conn) {
      const slug = conn.erpProfile ?? (conn.erpType === "nebim_v3" ? "nebim_v3" : null);
      if (slug) {
        customs = await findCustomItems(connectionId, slug).catch(() => []);
      }
    }
  }

  return Response.json({
    inferredForeignKeys: inferredFks,
    customItems: customs,
  });
}
