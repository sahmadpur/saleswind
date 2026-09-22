import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import { accountRef } from "@/lib/format";
import type { AccountFieldInput, AccountInput } from "@/schemas/account";

export async function createAccount(input: AccountInput, userId: string) {
  return db.$transaction(async (tx) => {
    const a = await tx.account.create({ data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null, createdById: userId } });
    await audit(tx, { userId, action: "account.create", entityType: "account", entityId: a.id, summary: `Created ${accountRef(a.number)} "${a.name}"` });
    return a;
  });
}

export async function listAccounts(q?: string) {
  return db.account.findMany({
    where: q ? { OR: (["name", "industry", "primaryContactName", "primaryContactEmail"] as const).map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { opportunities: true } } },
  });
}

export async function getAccount(id: string) {
  return db.account.findUnique({ where: { id }, include: { opportunities: { include: { status: true } } } });
}

export async function updateAccount(id: string, input: AccountInput, userId: string) {
  return db.$transaction(async (tx) => {
    const a = await tx.account.update({ where: { id }, data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null } });
    await audit(tx, { userId, action: "account.update", entityType: "account", entityId: id, summary: `Updated ${accountRef(a.number)} "${a.name}"`, details: input });
    return a;
  });
}

/** Inline single-cell edit from the accounts table. Blank optional fields are stored as null. */
export async function updateAccountField(id: string, input: AccountFieldInput, userId: string) {
  return db.$transaction(async (tx) => {
    const value = input.field === "name" ? input.value : input.value || null;
    const a = await tx.account.update({ where: { id }, data: { [input.field]: value } });
    await audit(tx, {
      userId, action: "account.update", entityType: "account", entityId: id,
      summary: `Updated ${input.field} of ${accountRef(a.number)} "${a.name}"`, details: { [input.field]: input.value },
    });
    return a;
  });
}

export async function updateAccountNotes(id: string, notes: string, userId: string) {
  return db.$transaction(async (tx) => {
    const a = await tx.account.update({ where: { id }, data: { notes: notes || null } });
    await audit(tx, { userId, action: "account.notes", entityType: "account", entityId: id, summary: `Updated notes of ${accountRef(a.number)} "${a.name}"` });
    return a;
  });
}
