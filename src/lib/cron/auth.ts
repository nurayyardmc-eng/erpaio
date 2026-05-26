import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { verifyBearerHeader } from "./timingSafeEqual";
import { REQUEST_ID_HEADER } from "@/lib/observability/requestId";

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

/**
 * Convenience wrapper — 5 cron route IDENTIK pattern paylasiyordu:
 *   const auth = await verifyCronAuth(req);
 *   if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });
 *
 * Pass → null, deny → 401 NextResponse (opsiyonel requestId header'i ile
 * trial-warnings + anomaly-detection gibi tracing-aware route'lar icin).
 *
 * Track LLLLLLLL — extracted.
 */
export async function assertCronAuth(
  req: NextRequest,
  requestId?: string,
): Promise<NextResponse | null> {
  const result = await verifyCronAuth(req);
  if (result.ok) return null;
  const headers: Record<string, string> = {};
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;
  return NextResponse.json(
    { error: result.reason },
    { status: 401, headers },
  );
}

