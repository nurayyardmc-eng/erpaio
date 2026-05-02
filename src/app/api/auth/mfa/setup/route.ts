import { z } from "zod";
import { toDataURL } from "qrcode";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { generateSecret, provisioningUri, verifyCode } from "@/lib/auth/totp";
import { hasFeature } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true },
  });
  if (!tenant || !hasFeature(tenant.plan, "mfa")) {
    return Response.json({ error: "MFA yalnızca Pro+ planlarda mevcut." }, { status: 403 });
  }

  const { base32, encrypted } = generateSecret();
  const uri = provisioningUri(session.user.email ?? "user", base32);
  const qr = await toDataURL(uri);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecretEnc: encrypted, totpEnabled: false },
  });

  return Response.json({ secret: base32, qr, uri });
}

const VerifySchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function PATCH(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = VerifySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: "6 haneli kod gerekli." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecretEnc: true },
  });
  if (!user?.totpSecretEnc) return Response.json({ error: "Önce setup yapın." }, { status: 400 });

  if (!verifyCode(user.totpSecretEnc, body.data.code)) {
    return Response.json({ error: "Kod yanlış." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecretEnc: null, totpEnabled: false },
  });
  return Response.json({ ok: true });
}
