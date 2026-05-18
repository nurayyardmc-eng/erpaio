import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { jsonError, localizedError } from "@/lib/i18n/server";

const PostSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return localizedError(req, 400, { tr: body.error.issues[0]?.message ?? "Geçersiz veri", en: body.error.issues[0]?.message ?? "Invalid data" });

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

/**
 * Sysadmin-only — platform genelinde NPS aggregate. Cross-tenant by design
 * (isSysAdmin gate'i ile korunur). Tenant kullanıcısı kendi tenant'ının
 * NPS'sini ayrı bir endpoint'ten almalı (bu sürümde yok — ihtiyaç oluştukça
 * eklenir).
 */
export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSysAdmin: true } });
  if (!user?.isSysAdmin) return jsonError(req, "api.forbidden", 403);

  const responses = await prisma.npsResponse.findMany({
    orderBy: { respondedAt: "desc" },
    take: 200,
    select: {
      score: true,
      comment: true,
      respondedAt: true,
      tenantId: true,
      tenant: { select: { name: true } },
    },
  });

  const promoters = responses.filter((r) => r.score >= 9).length;
  const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const total = responses.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  // Tenant breakdown — Track VVVV. /admin/nps sayfası hangi tenant'lar
  // unhappy görmek istiyor. tenantId + name + per-tenant aggregate.
  const byTenant: Record<string, { name: string; promoters: number; passives: number; detractors: number; total: number }> = {};
  for (const r of responses) {
    const key = r.tenantId;
    if (!byTenant[key]) {
      byTenant[key] = { name: r.tenant.name, promoters: 0, passives: 0, detractors: 0, total: 0 };
    }
    if (r.score >= 9) byTenant[key].promoters++;
    else if (r.score >= 7) byTenant[key].passives++;
    else byTenant[key].detractors++;
    byTenant[key].total++;
  }
  const tenants = Object.entries(byTenant)
    .map(([tenantId, agg]) => ({
      tenantId,
      name: agg.name,
      total: agg.total,
      nps: agg.total > 0 ? Math.round(((agg.promoters - agg.detractors) / agg.total) * 100) : 0,
      promoters: agg.promoters,
      passives: agg.passives,
      detractors: agg.detractors,
    }))
    .sort((a, b) => a.nps - b.nps); // En unhappy önce.

  return Response.json({
    nps,
    breakdown: { promoters, passives, detractors, total },
    responses,
    tenants,
  });
}
