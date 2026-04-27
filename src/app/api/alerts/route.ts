import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendWhatsApp, formatAlert } from "@/lib/notifications/whatsapp";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";

  const alerts = await prisma.alert.findMany({
    where: { tenantId: session.user.tenantId, status },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return Response.json(alerts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = await req.json();

  const alert = await prisma.alert.create({
    data: {
      tenantId: session.user.tenantId,
      type: body.type,
      severity: body.severity ?? "medium",
      title: body.title,
      description: body.description,
      module: body.module,
    },
  });

  // Yüksek öncelikli ise WhatsApp gönder
  if (["high", "critical"].includes(alert.severity)) {
    await sendWhatsApp(formatAlert(alert)).catch(console.error);
  }

  return Response.json(alert);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const { id, status } = await req.json();

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!alert) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  await prisma.alert.update({ where: { id }, data: { status } });
  return Response.json({ ok: true });
}