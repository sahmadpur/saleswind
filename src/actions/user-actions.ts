"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { userCreateSchema, userUpdateSchema } from "@/schemas/user";
import { createUser, deleteUser, updateUser, UserUpdateError } from "@/services/user-service";
import type { FormState } from "@/lib/action-state";

export async function createUserAction(_prev: unknown, formData: FormData) {
  const me = await requireRole("users:manage");
  const parsed = userCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await createUser(parsed.data, me.id);
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUserAction(id: string, _prev: unknown, _fd: FormData): Promise<FormState> {
  const me = await requireRole("users:manage");
  if (me.id === id) return { error: { _form: ["You cannot delete yourself"] } };
  try {
    await deleteUser(id, me.id);
  } catch (e) {
    return { error: { _form: [e instanceof Error ? e.message : "Delete failed"] } };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function updateUserAction(id: string, _prev: unknown, formData: FormData): Promise<FormState> {
  const me = await requireRole("users:manage");
  const parsed = userUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  try {
    await updateUser(id, parsed.data, me.id);
  } catch (e) {
    if (e instanceof UserUpdateError) return { error: { [e.field]: [e.message] } };
    throw e;
  }
  revalidatePath("/users");
  return { ok: true };
}
