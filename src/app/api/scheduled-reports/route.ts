import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  schedule: z.enum(["hourly", "daily_06", "daily_18", "weekly_monday", "monthly_first"]),
  emailTo: z.string().email(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const reports = await prisma.scheduledReport.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ reports });
}

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: body.data.connectionId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!conn) return Response.json({ error: "Bağlantı bulunamadı." }, { status: 404 });

  const report = await prisma.scheduledReport.create({
    data: { ...body.data, tenantId: session.user.tenantId, userId: session.user.id },
  });
  return Response.json({ report });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id gerekli." }, { status: 400 });

  await prisma.scheduledReport.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  });
  return Response.json({ ok: true });
}
