import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { verifyBearerHeader } from "./timingSafeEqual";

/**
 * Cron auth — bearer secret (production: GitHub Actions / Vercel cron) ya da
 * sysadmin session (Track JJ — /admin/cron-runs sayfasından manuel re-trigger).
 *
 * Hot path bearer-only; sysadmin DB lookup yalnız header eksikse yapılır,
 * cron throughput'una latency eklemez.
 */
export async function verifyCronAuth(req: NextRequest): Promise<{ ok: boolean; reason?: string }> {
  const bearer = verifyBearerHeader(req.headers.get("authorization"), process.env.CRON_SECRET);
  if (bearer.matched) {
    // Bearer present (ok ya da reject) → fallback yapma, leak surface'i daralt.
    return bearer.ok ? { ok: true } : { ok: false, reason: bearer.reason };
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

