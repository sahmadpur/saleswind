"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { userCreateSchema, userFieldSchema, userUpdateSchema, type UserField } from "@/schemas/user";
import { createUser, deleteUser, getUser, setUserBlocked, updateUser, UserUpdateError } from "@/services/user-service";
import { formValues, type FormState } from "@/lib/action-state";

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
  // Echo back everything except the password so the dialog keeps the edits.
  const values = formValues(formData);
  delete values.password;
  const parsed = userUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values };
  try {
    await updateUser(id, parsed.data, me.id);
  } catch (e) {
    if (e instanceof UserUpdateError) return { error: { [e.field]: [e.message] }, values };
    throw e;
  }
  revalidatePath("/users");
  return { ok: true };
}

/**
 * Inline cell edit from the users table. Reuses updateUser so the self-role and
 * last-admin guards still apply; returns the error instead of throwing so the cell shows it.
 */
export async function updateUserFieldAction(id: string, field: UserField, value: string): Promise<{ error?: string }> {
  const me = await requireRole("users:manage");
  const parsed = userFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid value" };
  const current = await getUser(id);
  try {
    await updateUser(id, { name: current.name, email: current.email, role: current.role, [parsed.data.field]: parsed.data.value }, me.id);
  } catch (e) {
    if (e instanceof UserUpdateError) return { error: e.message };
    return { error: "Could not save" };
  }
  revalidatePath("/users");
  return {};
}

export async function setUserBlockedAction(id: string, blocked: boolean, _prev: unknown, _fd: FormData): Promise<FormState> {
  const me = await requireRole("users:manage");
  try {
    await setUserBlocked(id, blocked, me.id);
  } catch (e) {
    if (e instanceof UserUpdateError) return { error: { _form: [e.message] } };
    throw e;
  }
  revalidatePath("/users");
  return { ok: true };
}
