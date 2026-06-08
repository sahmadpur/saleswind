import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserCreateInput } from "@/schemas/user";

export async function createUser(input: UserCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash } });
}
export async function listUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
