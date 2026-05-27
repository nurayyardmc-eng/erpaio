import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { requireSysAdmin } from "@/lib/auth/sysadmin";
import { prisma } from "@/lib/db/prisma";
import { aggregateNps, calcNps, npsBucket } from "@/lib/nps/calcNps";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { jsonError } from "@/lib/i18n/server";

const PostSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const body = await parseJsonBody(req, PostSchema);
  if (body instanceof Response) return body;

  await prisma.npsResponse.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      score: body.score,
      comment: body.comment ?? null,
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
  const guard = await requireSysAdmin(req);
  if ("error" in guard) return guard.error;

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

  const { promoters, passives, detractors, total, nps } = aggregateNps(
    responses.map((r) => r.score),
  );

  // Tenant breakdown — Track VVVV. /admin/nps sayfası hangi tenant'lar
  // unhappy görmek istiyor. tenantId + name + per-tenant aggregate.
  const byTenant: Record<string, { name: string; promoters: number; passives: number; detractors: number; total: number }> = {};
  for (const r of responses) {
    const key = r.tenantId;
    if (!byTenant[key]) {
      byTenant[key] = { name: r.tenant.name, promoters: 0, passives: 0, detractors: 0, total: 0 };
    }
    const bucket = npsBucket(r.score);
    if (bucket === "promoter") byTenant[key].promoters++;
    else if (bucket === "passive") byTenant[key].passives++;
    else byTenant[key].detractors++;
    byTenant[key].total++;
  }
  const tenants = Object.entries(byTenant)
    .map(([tenantId, agg]) => ({
      tenantId,
      name: agg.name,
      total: agg.total,
      nps: calcNps(agg.promoters, agg.detractors, agg.total),
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
