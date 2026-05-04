import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encrypt";
import { checkBodySize } from "@/lib/http/bodyLimit";

const PostSchema = z.object({
  kind: z.enum(["slack", "teams", "webhook"]),
  endpoint: z.string().url(),
  secret: z.string().min(8).max(128).optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const integrations = await prisma.tenantIntegration.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      kind: true,
      enabled: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastError: true,
      createdAt: true,
    },
  });
  return Response.json({ integrations });
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { kind, endpoint, secret } = body.data;

  const integration = await prisma.tenantIntegration.upsert({
    where: { tenantId_kind: { tenantId: session.user.tenantId, kind } },
    create: {
      tenantId: session.user.tenantId,
      kind,
      endpointEnc: encrypt(endpoint),
      secretEnc: secret ? encrypt(secret) : null,
      enabled: true,
    },
    update: {
      endpointEnc: encrypt(endpoint),
      secretEnc: secret ? encrypt(secret) : null,
      enabled: true,
      lastError: null,
      lastErrorAt: null,
    },
    select: { id: true, kind: true, enabled: true },
  });

  return Response.json({ integration });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  if (!kind) return Response.json({ error: "kind gerekli." }, { status: 400 });

  await prisma.tenantIntegration.deleteMany({
    where: { tenantId: session.user.tenantId, kind },
  });
  return Response.json({ ok: true });
}
