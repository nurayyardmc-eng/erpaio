import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";
import { checkBodySize } from "@/lib/http/bodyLimit";

const BodySchema = z.object({
  token: z.string().min(8).max(256),
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { token, platform, deviceName } = body.data;

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId: user.id, tenantId: user.tenantId, token, platform, deviceName },
    update: { userId: user.id, tenantId: user.tenantId, platform, deviceName, lastSeenAt: new Date() },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;
  const { user } = result;

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return Response.json({ error: "token gerekli." }, { status: 400 });

  await prisma.pushToken.deleteMany({
    where: { token, userId: user.id },
  });

  return Response.json({ ok: true });
}
