import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  whatsappTo: z.string().regex(/^whatsapp:\+?\d{6,15}$/).nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailTo: z.string().email().nullable().optional(),
  emailEnabled: z.boolean().optional(),
  alertMinSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      whatsappTo: true,
      whatsappEnabled: true,
      emailTo: true,
      emailEnabled: true,
      alertMinSeverity: true,
      createdAt: true,
    },
  });

  if (!tenant) return Response.json({ error: "Bulunamadı." }, { status: 404 });
  return Response.json(tenant);
}

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return Response.json({ error: "Yalnızca yönetici düzenleyebilir." }, { status: 403 });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: body.data,
    select: {
      id: true,
      name: true,
      whatsappTo: true,
      whatsappEnabled: true,
      emailTo: true,
      emailEnabled: true,
      alertMinSeverity: true,
    },
  });

  return Response.json(tenant);
}
