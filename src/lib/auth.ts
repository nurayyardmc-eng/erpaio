import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { verifyCode } from "@/lib/auth/totp";
import { consumeRecoveryCode, looksLikeRecoveryCode } from "@/lib/auth/recovery";
import { nextLockoutState } from "@/lib/auth/lockout";

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
        // Shared lockout increment for ANY failed factor (password or MFA).
        const registerFailure = () =>
          prisma.user.update({
            where: { id: user.id },
            data: nextLockoutState(user.failedLoginCount, Date.now()),
          });

        if (!valid) {
          await registerFailure();
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
              await registerFailure();
              throw new Error("MFA_REQUIRED");
            }
          } else if (!verifyCode(user.totpSecretEnc, code)) {
            await registerFailure();
            throw new Error("MFA_REQUIRED");
          }
        }

        if ((user.failedLoginCount ?? 0) > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
        }

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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
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
