import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { verifyCode } from "@/lib/auth/totp";
import { consumeRecoveryCode, looksLikeRecoveryCode } from "@/lib/auth/recovery";
import { nextLockoutState } from "@/lib/auth/lockout";
import { recordActivity } from "@/lib/audit/activity";

// Re-verify a session's role against the DB at most this often (bounds how long
// a demoted/promoted user keeps their old role from the JWT).
const ROLE_REFRESH_MS = 5 * 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        totpCode: { type: "text" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true },
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        // Shared lockout increment + audit for ANY failed factor (password/MFA).
        const registerFailure = async (
          action: "auth.login_failed" | "auth.mfa_failed",
        ) => {
          const state = nextLockoutState(user.failedLoginCount, Date.now());
          await prisma.user.update({ where: { id: user.id }, data: state });
          const actor = { userId: user.id, tenantId: user.tenantId, email: user.email };
          await recordActivity({ ...actor, action });
          if (state.lockedUntil) await recordActivity({ ...actor, action: "auth.locked" });
        };

        if (!valid) {
          await registerFailure("auth.login_failed");
          return null;
        }

        if (user.totpEnabled && user.totpSecretEnc) {
          const code = (credentials.totpCode as string | undefined) ?? "";
          // Recovery code path: XXXX-XXXX format — bypasses TOTP, consumes the code.
          // A wrong TOTP OR a bad recovery code counts toward lockout too —
          // otherwise the second factor has no brute-force protection.
          if (looksLikeRecoveryCode(code)) {
            const ok = await consumeRecoveryCode(user.id, code);
            if (!ok) {
              await registerFailure("auth.mfa_failed");
              throw new Error("MFA_REQUIRED");
            }
          } else if (!verifyCode(user.totpSecretEnc, code)) {
            await registerFailure("auth.mfa_failed");
            throw new Error("MFA_REQUIRED");
          }
        }

        if ((user.failedLoginCount ?? 0) > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
        }

        await recordActivity({
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email,
          action: "auth.login",
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.roleCheckedAt = Date.now();
        return token;
      }
      // Re-read the role from the DB on a short interval so role changes
      // (e.g. an owner demoting an admin) take effect within ~5 min instead of
      // at the 24h JWT expiry. All authz gates read session.user.role, so this
      // one refresh fixes staleness everywhere without touching call sites.
      const uid = typeof token.id === "string" ? token.id : token.sub;
      const checkedAt = typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
      if (uid && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        try {
          const fresh = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
          // A deleted/revoked user must NOT keep their old role — neutralize so
          // every authz gate denies (fail closed). Only a live user's real role
          // is trusted.
          token.role = fresh ? fresh.role : "revoked";
          token.roleCheckedAt = Date.now();
        } catch {
          // Transient DB error — keep the existing role rather than logging
          // everyone out on a blip; retry on the next request (checkedAt unchanged).
        }
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      else if (typeof token.sub === "string") session.user.id = token.sub;
      if (typeof token.tenantId === "string") session.user.tenantId = token.tenantId;
      if (typeof token.role === "string") session.user.role = token.role;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
