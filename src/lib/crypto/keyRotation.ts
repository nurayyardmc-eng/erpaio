import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { childLogger } from "@/lib/observability/logger";

const log = childLogger({ component: "key-rotation" });

export async function registerCurrentKey(): Promise<{ version: number; isNew: boolean }> {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY required");

  const hash = createHash("sha256").update(raw).digest("hex");

  const existing = await prisma.encryptionKey.findFirst({
    where: { keyHashSha256: hash },
  });
  if (existing) return { version: existing.version, isNew: false };

  const latest = await prisma.encryptionKey.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  if (latest) {
    await prisma.encryptionKey.updateMany({
      where: { version: latest.version },
      data: { rotatedAt: new Date() },
    });
  }

  await prisma.encryptionKey.create({
    data: { version, keyHashSha256: hash },
  });

  log.warn({ newVersion: version }, "ENCRYPTION_KEY rotation detected");
  return { version, isNew: true };
}

export async function getKeyHistory(): Promise<{
  version: number;
  active: boolean;
  rotatedAt: Date | null;
  createdAt: Date;
}[]> {
  const keys = await prisma.encryptionKey.findMany({
    orderBy: { version: "desc" },
    select: { version: true, rotatedAt: true, createdAt: true },
  });
  return keys.map((k) => ({
    version: k.version,
    active: k.rotatedAt === null,
    rotatedAt: k.rotatedAt,
    createdAt: k.createdAt,
  }));
}
