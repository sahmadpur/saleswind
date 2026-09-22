import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import { Prisma } from "@prisma/client";
import type { UserCreateInput, UserUpdateInput } from "@/schemas/user";

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

export class UserUpdateError extends Error {
  constructor(message: string, readonly field: "email" | "role" | "_form" = "_form") {
    super(message);
    this.name = "UserUpdateError";
  }
}

/** Admin edit of another user (or themselves, except their own role). Keeps at least one admin. */
export async function updateUser(id: string, input: UserUpdateInput, actorId: string) {
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
  try {
    return await db.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id } });
      if (id === actorId && input.role !== before.role) throw new UserUpdateError("You cannot change your own role", "role");
      if (before.role === "ADMIN" && input.role !== "ADMIN" && !before.blockedAt && (await activeAdminCount(tx)) <= 1) {
        throw new UserUpdateError("At least one admin is required", "role");
      }
      const u = await tx.user.update({
        where: { id },
        data: { name: input.name, email: input.email, role: input.role, ...(passwordHash && { passwordHash }) },
      });
      const fields = (["name", "email", "role"] as const).filter((k) => before[k] !== u[k]);
      const changed = passwordHash ? [...fields, "password"] : fields;
      if (changed.length > 0) {
        await audit(tx, {
          userId: actorId, action: "user.update", entityType: "user", entityId: id,
          summary: `Updated user ${u.name} (${changed.join(", ")})`,
          details: Object.fromEntries(fields.map((k) => [k, { from: before[k], to: u[k] }])),
        });
      }
      return u;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new UserUpdateError("Email is already in use", "email");
    throw e;
  }
}

type Tx = Prisma.TransactionClient;

/** Admins who can still sign in. */
const activeAdminCount = (tx: Tx) => tx.user.count({ where: { role: "ADMIN", blockedAt: null } });

/** Block or unblock sign-in. Blocked users are signed out on their next request (see requireUser). */
export async function setUserBlocked(id: string, blocked: boolean, actorId: string) {
  if (id === actorId) throw new UserUpdateError("You cannot block yourself");
  return db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id } });
    if (!!before.blockedAt === blocked) return before;
    if (blocked && before.role === "ADMIN" && (await activeAdminCount(tx)) <= 1) {
      throw new UserUpdateError("At least one active admin is required");
    }
    const u = await tx.user.update({ where: { id }, data: { blockedAt: blocked ? new Date() : null } });
    await audit(tx, {
      userId: actorId, action: blocked ? "user.block" : "user.unblock", entityType: "user", entityId: id,
      summary: `${blocked ? "Blocked" : "Unblocked"} user ${u.name} <${u.email}>`,
    });
    return u;
  });
}

export async function deleteUser(id: string, actorId: string | null) {
  const [opps, comments, tasks] = await Promise.all([
    db.opportunity.count({ where: { accountableId: id } }),
    db.comment.count({ where: { authorId: id } }),
    db.task.count({ where: { OR: [{ assigneeId: id }, { createdById: id }] } }),
  ]);
  if (opps > 0 || comments > 0 || tasks > 0) throw new Error("Cannot delete: user has opportunities, comments or tasks");
  await db.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: id } });
    const u = await tx.user.delete({ where: { id } });
    await audit(tx, { userId: actorId, action: "user.delete", entityType: "user", entityId: id, summary: `Deleted user ${u.name} <${u.email}>` });
  });
}

export async function getUser(id: string) {
  return db.user.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, email: true, role: true } });
}

export async function listUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, blockedAt: true, createdAt: true } });
}
