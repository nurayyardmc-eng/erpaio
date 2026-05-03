import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { verifyCode } from "@/lib/auth/totp";

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
        if (!valid) {
          const nextCount = (user.failedLoginCount ?? 0) + 1;
          const shouldLock = nextCount >= 5;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: nextCount,
              lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60_000) : null,
            },
          });
          return null;
        }

        if (user.totpEnabled && user.totpSecretEnc) {
          const code = (credentials.totpCode as string | undefined) ?? "";
          if (!verifyCode(user.totpSecretEnc, code)) {
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
