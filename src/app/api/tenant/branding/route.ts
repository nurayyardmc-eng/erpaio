import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { hasFeature } from "@/lib/plans";

const PatchSchema = z.object({
  brandingLogoUrl: z.string().url().nullable().optional(),
  brandingPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  brandingSenderName: z.string().min(1).max(60).nullable().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true, brandingLogoUrl: true, brandingPrimary: true, brandingSenderName: true },
  });
  if (!tenant) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  return Response.json({
    branding: {
      logoUrl: tenant.brandingLogoUrl,
      primary: tenant.brandingPrimary,
      senderName: tenant.brandingSenderName,
    },
    available: hasFeature(tenant.plan, "white_label"),
  });
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true },
  });
  if (!tenant || !hasFeature(tenant.plan, "white_label")) {
    return Response.json({ error: "White-label yalnızca Enterprise planda." }, { status: 403 });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const updated = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body.data,
    select: { brandingLogoUrl: true, brandingPrimary: true, brandingSenderName: true },
  });
  return Response.json({ branding: updated });
}
