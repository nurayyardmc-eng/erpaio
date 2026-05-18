import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * Cron auth — bearer secret (production: GitHub Actions / Vercel cron) ya da
 * sysadmin session (Track JJ — /admin/cron-runs sayfasından manuel re-trigger).
 *
 * Hot path bearer-only; sysadmin DB lookup yalnız header eksikse yapılır,
 * cron throughput'una latency eklemez.
 */
export async function verifyCronAuth(req: NextRequest): Promise<{ ok: boolean; reason?: string }> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return { ok: false, reason: "CRON_SECRET not configured" };
    }
    const expected = `Bearer ${secret}`;
    if (timingSafeEqual(authHeader, expected)) {
      return { ok: true };
    }
    // Bearer present ama mismatch → fallback yapma, leak surface'i daralt.
    return { ok: false, reason: "Invalid cron secret" };
  }

  // Sysadmin session fallback — browser cookie auth ile manuel trigger.
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSysAdmin: true },
    });
    if (user?.isSysAdmin) {
      return { ok: true };
    }
  }

  return { ok: false, reason: "Missing Authorization header" };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
