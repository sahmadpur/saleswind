import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserCreateInput } from "@/schemas/user";

export async function createUser(input: UserCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash } });
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
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function deleteUser(id: string) {
  const [opps, comments] = await Promise.all([
    db.opportunity.count({ where: { accountableId: id } }),
    db.comment.count({ where: { authorId: id } }),
  ]);
  if (opps > 0 || comments > 0) throw new Error("Cannot delete: user has opportunities or comments");
  await db.$transaction([db.notification.deleteMany({ where: { userId: id } }), db.user.delete({ where: { id } })]);
}

export async function listUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
