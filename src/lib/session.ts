import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Action } from "@/lib/domain/permissions";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
}

export function assertRole(user: { role: Role }, action: Action): void {
  if (!can(user.role, action)) throw new Error("Forbidden");
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  // Sessions are JWTs, so a blocked or deleted user keeps a valid cookie; check the DB and sign them out.
  const row = await db.user.findUnique({ where: { id: user.id }, select: { blockedAt: true } });
  if (!row || row.blockedAt) redirect("/signed-out");
  return user;
}

export async function requireRole(action: Action): Promise<SessionUser> {
  const user = await requireUser();
  assertRole(user, action);
  return user;
}
