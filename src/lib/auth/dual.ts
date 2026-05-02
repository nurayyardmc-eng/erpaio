import { createHash, randomBytes } from "node:crypto";
import { auth as nextAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export interface AuthedUser {
  id: string;
  email?: string | null;
  tenantId: string;
  role: string;
  authMethod: "session" | "token";
  tokenId?: string;
}

export function generateApiToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashApiToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function authenticate(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const raw = authHeader.slice(7).trim();
    if (raw.length >= 16) {
      const tokenHash = hashApiToken(raw);
      const tokenRow = await prisma.apiToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, email: true, role: true, tenantId: true } } },
      });
      if (
        tokenRow &&
        !tokenRow.revoked &&
        (!tokenRow.expiresAt || tokenRow.expiresAt > new Date())
      ) {
        prisma.apiToken
          .update({ where: { id: tokenRow.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {});

        return {
          id: tokenRow.user.id,
          email: tokenRow.user.email,
          tenantId: tokenRow.user.tenantId,
          role: tokenRow.user.role,
          authMethod: "token",
          tokenId: tokenRow.id,
        };
      }
    }
  }

  const session = await nextAuth();
  if (session?.user) {
    return {
      id: session.user.id,
      email: session.user.email,
      tenantId: session.user.tenantId,
      role: session.user.role,
      authMethod: "session",
    };
  }
  return null;
}

export async function requireAuth(req: Request): Promise<{ user: AuthedUser } | { error: Response }> {
  const user = await authenticate(req);
  if (!user) {
    return {
      error: Response.json({ error: "Yetkisiz." }, { status: 401 }),
    };
  }
  return { user };
}

export async function getAuth(req: Request): Promise<{ user: AuthedUser } | null> {
  const user = await authenticate(req);
  return user ? { user } : null;
}
