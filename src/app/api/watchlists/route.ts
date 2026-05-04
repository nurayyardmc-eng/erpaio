import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  thresholdOp: z.enum(["lt", "lte", "gt", "gte", "eq"]),
  thresholdVal: z.number(),
  emailTo: z.string().email().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const watchlists = await prisma.watchlist.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ watchlists });
}

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: body.data.connectionId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!conn) return Response.json({ error: "Bağlantı bulunamadı." }, { status: 404 });

  const watchlist = await prisma.watchlist.create({
    data: {
      ...body.data,
      emailTo: body.data.emailTo ?? null,
      tenantId: session.user.tenantId,
      userId: session.user.id,
    },
  });
  return Response.json({ watchlist });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id gerekli." }, { status: 400 });

  await prisma.watchlist.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}
