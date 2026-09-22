import "server-only";
import { Prisma, type DirectoryKind } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import { directoryRef } from "@/lib/directory";
import type { DirectoryFieldInput, DirectoryInput } from "@/schemas/directory";

const clean = (input: DirectoryInput) => ({
  name: input.name,
  contactName: input.contactName || null,
  email: input.email || null,
  phone: input.phone || null,
  website: input.website || null,
  notes: input.notes || null,
});

export async function createDirectoryEntry(kind: DirectoryKind, input: DirectoryInput, userId: string) {
  // Numbers run per kind (VEN-0001, STF-0001…). Retry if a concurrent insert took the same number.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const last = await tx.directoryEntry.findFirst({ where: { kind }, orderBy: { number: "desc" }, select: { number: true } });
        const e = await tx.directoryEntry.create({ data: { kind, number: (last?.number ?? 0) + 1, ...clean(input), createdById: userId } });
        await audit(tx, { userId, action: "directory.create", entityType: kind.toLowerCase(), entityId: e.id, summary: `Created ${directoryRef(kind, e.number)} "${e.name}"` });
        return e;
      });
    } catch (err) {
      if (attempt < 2 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
}

export async function updateDirectoryEntry(id: string, input: DirectoryInput, userId: string) {
  return db.$transaction(async (tx) => {
    const e = await tx.directoryEntry.update({ where: { id }, data: clean(input) });
    await audit(tx, { userId, action: "directory.update", entityType: e.kind.toLowerCase(), entityId: id, summary: `Updated ${directoryRef(e.kind, e.number)} "${e.name}"`, details: input });
    return e;
  });
}

/** Inline single-cell edit from a directory table. Blank optional fields are stored as null. */
export async function updateDirectoryField(id: string, input: DirectoryFieldInput, userId: string) {
  return db.$transaction(async (tx) => {
    const value = input.field === "name" ? input.value : input.value || null;
    const e = await tx.directoryEntry.update({ where: { id }, data: { [input.field]: value } });
    await audit(tx, {
      userId, action: "directory.update", entityType: e.kind.toLowerCase(), entityId: id,
      summary: `Updated ${input.field} of ${directoryRef(e.kind, e.number)} "${e.name}"`, details: { [input.field]: input.value },
    });
    return e;
  });
}

export async function deleteDirectoryEntry(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const e = await tx.directoryEntry.delete({ where: { id } });
    await audit(tx, { userId, action: "directory.delete", entityType: e.kind.toLowerCase(), entityId: id, summary: `Deleted ${directoryRef(e.kind, e.number)} "${e.name}"` });
    return e;
  });
}

export async function listDirectory(kind: DirectoryKind, q?: string) {
  return db.directoryEntry.findMany({
    where: {
      kind,
      ...(q && { OR: (["name", "contactName", "email", "phone"] as const).map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) }),
    },
    orderBy: { number: "desc" },
  });
}

export async function getDirectoryEntry(kind: DirectoryKind, id: string) {
  return db.directoryEntry.findFirst({ where: { id, kind } });
}
