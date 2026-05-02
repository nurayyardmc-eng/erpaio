import { NextRequest } from "next/server";

export function verifyCronAuth(req: NextRequest): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, reason: "CRON_SECRET not configured" };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { ok: false, reason: "Missing Authorization header" };
  }

  const expected = `Bearer ${secret}`;
  if (!timingSafeEqual(authHeader, expected)) {
    return { ok: false, reason: "Invalid cron secret" };
  }

  return { ok: true };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
