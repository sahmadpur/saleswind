import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import type { UserCreateInput } from "@/schemas/user";

export async function createUser(input: UserCreateInput, actorId: string | null) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash } });
    await audit(tx, { userId: actorId, action: "user.create", entityType: "user", entityId: u.id, summary: `Created user ${u.name} <${u.email}> as ${u.role}` });
    return u;
  });
}
export class InvalidPasswordError extends Error {
  constructor() {
    super("Current password is incorrect");
    this.name = "InvalidPasswordError";
  }
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new InvalidPasswordError();
  const passwordHash = await bcrypt.hash(next, 10);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await audit(tx, { userId, action: "user.password", entityType: "user", entityId: userId, summary: "Changed own password" });
  });
}

export async function deleteUser(id: string, actorId: string | null) {
  const [opps, comments] = await Promise.all([
    db.opportunity.count({ where: { accountableId: id } }),
    db.comment.count({ where: { authorId: id } }),
  ]);
  if (opps > 0 || comments > 0) throw new Error("Cannot delete: user has opportunities or comments");
  await db.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: id } });
    const u = await tx.user.delete({ where: { id } });
    await audit(tx, { userId: actorId, action: "user.delete", entityType: "user", entityId: id, summary: `Deleted user ${u.name} <${u.email}>` });
  });
}

export async function listUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
