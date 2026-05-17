import { auth as nextAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { hashApiToken } from "./apiToken";

// Re-export so existing call sites (`import from "@/lib/auth/dual"`) keep working.
export { generateApiToken, hashApiToken } from "./apiToken";

export interface AuthedUser {
  id: string;
  email?: string | null;
  tenantId: string;
  role: string;
  authMethod: "session" | "token";
  tokenId?: string;
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
    return { error: jsonError(req, "api.unauthorized", 401) };
  }
  return { user };
}

export async function getAuth(req: Request): Promise<{ user: AuthedUser } | null> {
  const user = await authenticate(req);
  return user ? { user } : null;
}
