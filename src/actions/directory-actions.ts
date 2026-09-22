"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DirectoryKind } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { formValues, type FormState } from "@/lib/action-state";
import { DIRECTORY } from "@/lib/directory";
import { directoryFieldSchema, directorySchema, type DirectoryField } from "@/schemas/directory";
import { createDirectoryEntry, deleteDirectoryEntry, updateDirectoryEntry, updateDirectoryField } from "@/services/directory-service";

const isKind = (k: string): k is DirectoryKind => k in DIRECTORY;

export async function createDirectoryEntryAction(kind: DirectoryKind, _prev: unknown, formData: FormData): Promise<FormState> {
  const user = await requireRole("directory:write");
  if (!isKind(kind)) throw new Error("Unknown directory");
  const parsed = directorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  const e = await createDirectoryEntry(kind, parsed.data, user.id);
  revalidatePath(`/${DIRECTORY[kind].slug}`);
  redirect(`/${DIRECTORY[kind].slug}/${e.id}`);
}

export async function updateDirectoryEntryAction(id: string, _prev: unknown, formData: FormData): Promise<FormState> {
  const user = await requireRole("directory:write");
  const parsed = directorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  const e = await updateDirectoryEntry(id, parsed.data, user.id);
  revalidatePath(`/${DIRECTORY[e.kind].slug}`);
  revalidatePath(`/${DIRECTORY[e.kind].slug}/${id}`);
  return { ok: true };
}

/** Inline cell edit: returns the error instead of throwing so the cell can show it in place. */
export async function updateDirectoryFieldAction(id: string, field: DirectoryField, value: string): Promise<{ error?: string }> {
  const user = await requireRole("directory:write");
  const parsed = directoryFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid value" };
  try {
    const e = await updateDirectoryField(id, parsed.data, user.id);
    revalidatePath(`/${DIRECTORY[e.kind].slug}`);
    revalidatePath(`/${DIRECTORY[e.kind].slug}/${id}`);
  } catch {
    return { error: "Could not save" };
  }
  return {};
}

export async function deleteDirectoryEntryAction(id: string) {
  const user = await requireRole("directory:write");
  const e = await deleteDirectoryEntry(id, user.id);
  revalidatePath(`/${DIRECTORY[e.kind].slug}`);
  redirect(`/${DIRECTORY[e.kind].slug}`);
}
