import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";

const PostSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  await prisma.npsResponse.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      score: body.data.score,
      comment: body.data.comment ?? null,
      promptedAt: new Date(),
    },
  });

  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSysAdmin: true } });
  if (!user?.isSysAdmin) return Response.json({ error: "Sysadmin." }, { status: 403 });

  const responses = await prisma.npsResponse.findMany({
    orderBy: { respondedAt: "desc" },
    take: 200,
    select: {
      score: true,
      comment: true,
      respondedAt: true,
      tenantId: true,
    },
  });

  const promoters = responses.filter((r) => r.score >= 9).length;
  const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const total = responses.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return Response.json({
    nps,
    breakdown: { promoters, passives, detractors, total },
    responses,
  });
}
