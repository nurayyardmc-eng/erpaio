import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/dual";

export async function POST(req: Request) {
  const result = await requireAuth(req);
  if ("error" in result) return result.error;

  const { user } = result;

  // Mobile push token cleanup — logout sonrası bu cihaza push gitmemeli.
  // Cihazda halen kayıtlı kullanıcı varsa yeniden login'de yeni token gelir.
  // PushToken modeli token UNIQUE constraint'i ile çalıştığı için
  // deleteMany(userId) güvenli (başka kullanıcının token'larını silmez).
  // Body'den explicit token gelirse sadece o cihazın token'ı silinir
  // (multi-device kullanıcılar için).
  let deviceToken: string | undefined;
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token === "string" && body.token.length >= 8) {
      deviceToken = body.token;
    }
  } catch {
    // Body parse failure tolerable — fall through to wholesale delete.
  }

  await prisma.pushToken.deleteMany({
    where: deviceToken
      ? { userId: user.id, token: deviceToken }
      : { userId: user.id },
  });

  if (user.authMethod === "token" && user.tokenId) {
    await prisma.apiToken.update({
      where: { id: user.tokenId },
      data: { revoked: true },
    });
  }

  return Response.json({ ok: true });
}
