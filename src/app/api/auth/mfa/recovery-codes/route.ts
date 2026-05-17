import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import {
  generateRecoveryCodes,
  recoveryCodeStatus,
} from "@/lib/auth/recovery";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const status = await recoveryCodeStatus(session.user.id);
  return Response.json(status);
}

/**
 * Generate (or regenerate) recovery codes.
 * Requires MFA to be already enabled — recovery only makes sense if MFA is on.
 * Returns plaintext codes ONCE; never retrievable again.
 */
export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true },
  });
  if (!user?.totpEnabled) {
    return Response.json(
      { error: "Önce MFA'yı etkinleştirin." },
      { status: 400 },
    );
  }

  const codes = await generateRecoveryCodes(session.user.id);
  return Response.json({ codes });
}
