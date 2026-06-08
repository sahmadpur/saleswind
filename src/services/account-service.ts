import "server-only";
import { db } from "@/lib/db";
import type { AccountInput } from "@/schemas/account";

export async function createAccount(input: AccountInput, userId: string) {
  return db.account.create({ data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null, createdById: userId } });
}

export async function listAccounts() {
  return db.account.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { opportunities: true } } } });
}

export async function getAccount(id: string) {
  return db.account.findUnique({ where: { id }, include: { opportunities: { include: { status: true } } } });
}

export async function updateAccount(id: string, input: AccountInput) {
  return db.account.update({ where: { id }, data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null } });
}
