import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";

export async function POST(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;

  const { user } = result;

  if (user.authMethod === "token" && user.tokenId) {
    await prisma.apiToken.update({
      where: { id: user.tokenId },
      data: { revoked: true },
    });
  }

  return Response.json({ ok: true });
}
