import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let dbOk = false;
  let dbLatency = 0;
  let dbError: string | undefined;

  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - t;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const ok = dbOk;
  const status = ok ? 200 : 503;

  return Response.json(
    {
      ok,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      checks: {
        database: { ok: dbOk, latencyMs: dbLatency, error: dbError },
      },
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - startedAt,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
