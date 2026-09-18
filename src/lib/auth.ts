import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { audit } from "@/services/audit-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = creds?.email as string;
        const password = creds?.password as string;
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        const ok = !!user && (await bcrypt.compare(password, user.passwordHash));
        if (!user || !ok) {
          await audit(db, { userId: user?.id ?? null, action: "auth.login-failed", entityType: "user", entityId: user?.id, summary: `Failed sign-in for ${email}` });
          return null;
        }
        if (user.blockedAt) {
          await audit(db, { userId: user.id, action: "auth.login-blocked", entityType: "user", entityId: user.id, summary: `Blocked sign-in for ${email}` });
          return null;
        }
        await audit(db, { userId: user.id, action: "auth.login", entityType: "user", entityId: user.id, summary: `Signed in as ${user.email}` });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});

/**
 * True when the credentials are correct but the account is blocked, so the login page can say so.
 * Only answers for a correct password, so it doesn't reveal which emails are blocked.
 */
export async function isBlockedLogin(email: string, password: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email }, select: { passwordHash: true, blockedAt: true } });
  return !!user?.blockedAt && (await bcrypt.compare(password, user.passwordHash));
}
