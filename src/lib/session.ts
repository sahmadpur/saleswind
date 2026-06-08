import { auth } from "@/lib/auth";
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
  return user;
}

export async function requireRole(action: Action): Promise<SessionUser> {
  const user = await requireUser();
  assertRole(user, action);
  return user;
}
