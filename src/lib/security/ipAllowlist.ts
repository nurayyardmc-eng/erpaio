import { prisma } from "@/lib/db/prisma";

const cache = new Map<string, { cidrs: string[]; ts: number }>();
const TTL_MS = 5 * 60_000;

// Exported for test (Track TTT). Pure helpers, no side effects.
export function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0;
}

export function cidrMatch(ip: string, cidr: string): boolean {
  if (!ip || !cidr) return false;
  if (!cidr.includes("/")) return ip === cidr;
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(base)) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  return (ipInt & mask) === (baseInt & mask);
}

export async function getAllowlist(tenantId: string): Promise<string[]> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.cidrs;

  const rows = await prisma.tenantIpAllowlist.findMany({
    where: { tenantId },
    select: { cidr: true },
  });
  const cidrs = rows.map((r) => r.cidr);
  cache.set(tenantId, { cidrs, ts: Date.now() });
  return cidrs;
}

export async function isIpAllowed(tenantId: string, ip: string): Promise<{ allowed: boolean; configured: boolean }> {
  const cidrs = await getAllowlist(tenantId);
  if (cidrs.length === 0) return { allowed: true, configured: false };
  for (const cidr of cidrs) {
    if (cidrMatch(ip, cidr)) return { allowed: true, configured: true };
  }
  return { allowed: false, configured: true };
}

export function invalidateAllowlist(tenantId: string): void {
  cache.delete(tenantId);
}
