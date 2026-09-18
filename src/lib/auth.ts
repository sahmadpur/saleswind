import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { audit } from "@/services/audit-service";

/**
 * Microsoft (Office 365) sign-in is on only with a specific tenant ID: with "common" any personal
 * Microsoft account could get in. Reuses the Outlook app registration (MS_CLIENT_ID / MS_CLIENT_SECRET).
 */
function microsoftTenant(): string | null {
  const t = process.env.MS_TENANT_ID?.trim();
  if (!t || !process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) return null;
  return ["common", "organizations", "consumers"].includes(t.toLowerCase()) ? null : t;
}
export const microsoftLoginEnabled = () => microsoftTenant() !== null;

type EntraProfile = { tid?: string; email?: string; preferred_username?: string; upn?: string; name?: string };

/** Office email candidates from the ID token: primary email, then sign-in name (UPN). */
const entraEmails = (p: EntraProfile) =>
  [...new Set([p.email, p.preferred_username, p.upn].filter((e): e is string => !!e && e.includes("@")).map((e) => e.toLowerCase()))];

/** Existing user by any of the account's addresses (case-insensitive), so people keep their opportunities and role. */
async function findEntraUser(p: EntraProfile) {
  for (const email of entraEmails(p)) {
    const u = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (u) return u;
  }
  return null;
}

const tenant = microsoftTenant();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Anyone in our tenant may sign in; first sign-in creates an Agent. Blocked users and other tenants are refused.
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "microsoft-entra-id") return true;
      const p = (profile ?? {}) as EntraProfile;
      const email = entraEmails(p)[0];
      if (!tenant || p.tid?.toLowerCase() !== tenant.toLowerCase() || !email) {
        await audit(db, { userId: null, action: "auth.login-failed", entityType: "user", summary: `Refused Microsoft sign-in for ${email ?? "unknown"} (tenant ${p.tid ?? "?"})` });
        return false;
      }
      let user = await findEntraUser(p);
      if (user?.blockedAt) {
        await audit(db, { userId: user.id, action: "auth.login-blocked", entityType: "user", entityId: user.id, summary: `Blocked Microsoft sign-in for ${email}` });
        return "/login?error=blocked";
      }
      if (!user) {
        // No usable password: a random hash nobody knows. Admins can set one in Users if needed.
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 10);
        user = await db.user.create({ data: { name: p.name?.trim() || email, email, role: "AGENT", passwordHash } });
        await audit(db, { userId: user.id, action: "user.create", entityType: "user", entityId: user.id, summary: `Created user ${user.name} <${email}> as AGENT on first Microsoft sign-in` });
      }
      await audit(db, { userId: user.id, action: "auth.login", entityType: "user", entityId: user.id, summary: `Signed in with Microsoft as ${email}` });
      return true;
    },
    // For Microsoft sign-ins the provider's user id is the Entra object id; swap in our own user id and role.
    jwt: async (params) => {
      const { token, account, profile } = params;
      if (account?.provider === "microsoft-entra-id") {
        const u = await findEntraUser((profile ?? {}) as EntraProfile);
        if (!u) throw new Error("Microsoft user not provisioned");
        token.id = u.id;
        token.role = u.role;
        token.name = u.name;
        token.email = u.email;
        delete token.picture;
        return token;
      }
      return authConfig.callbacks.jwt(params);
    },
  },
  providers: [
    ...(tenant
      ? [
          MicrosoftEntraID({
            clientId: process.env.MS_CLIENT_ID,
            clientSecret: process.env.MS_CLIENT_SECRET,
            issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
            authorization: { params: { scope: "openid profile email", prompt: "select_account" } },
            // Skip the default Graph photo fetch: it would put a base64 image in the session cookie.
            // Role is a placeholder; the jwt callback replaces id and role with the Saleswind user's.
            profile: (p) => ({ id: p.sub, name: p.name, email: p.email ?? p.preferred_username, role: "AGENT" }),
          }),
        ]
      : []),
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
